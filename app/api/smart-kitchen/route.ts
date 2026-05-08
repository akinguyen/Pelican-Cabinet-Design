import { NextResponse } from "next/server";

import {
  filterRoomForKitchenGeneration,
  generateKitchenLayout,
  generateSmartKitchenLayout,
} from "@/lib/ai/kitchenDesigner";
import type {
  AiRoomInput,
  SmartKitchenPlan,
  SmartKitchenWallPlan,
} from "@/lib/ai/types";

type SmartKitchenRequestBody = {
  room?: AiRoomInput;
  selectedWallIds?: string[];
  designerFeedback?: string;
};

type OpenAIResponsesOutputMessage = {
  type?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

type OpenAIResponsesPayload = {
  output?: OpenAIResponsesOutputMessage[];
};

function getResponseText(payload: OpenAIResponsesPayload) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;

    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "output_text" && contentItem.text) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function stripMarkdownCodeFence(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function extractBalancedJsonSnippet(value: string) {
  const source = stripMarkdownCodeFence(value);
  const startIndex = source.search(/[\{\[]/);

  if (startIndex < 0) return null;

  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.at(-1) !== expected) return null;
      stack.pop();

      if (stack.length === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parsePlannerJson(value: string) {
  const directValue = stripMarkdownCodeFence(value);

  try {
    return JSON.parse(directValue);
  } catch {
    const extracted = extractBalancedJsonSnippet(directValue);
    if (!extracted) throw new Error("No balanced JSON object found in planner output.");
    return JSON.parse(extracted);
  }
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toBoolean(value: unknown) {
  return value === true;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getWallLabelLookup(room: AiRoomInput) {
  return new Map(
    room.walls
      .filter((wall) => wall.kind !== "thin-wall")
      .map((wall, index) => [wall.id, `Wall ${index + 1}`] as const)
  );
}

function normalizeWallPlan(
  room: AiRoomInput,
  value: unknown
): SmartKitchenWallPlan | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const wallLabelLookup = getWallLabelLookup(room);
  const labelToIdLookup = new Map(
    Array.from(wallLabelLookup.entries()).map(([resolvedWallId, resolvedWallLabel]) => [
      resolvedWallLabel.toLowerCase(),
      resolvedWallId,
    ])
  );
  const wallIdCandidate =
    typeof candidate.wallId === "string" ? candidate.wallId : null;
  const wallLabelCandidate =
    typeof candidate.wallLabel === "string" ? candidate.wallLabel : null;
  const wallId =
    wallIdCandidate && room.walls.some((wall) => wall.id === wallIdCandidate && wall.kind !== "thin-wall")
      ? wallIdCandidate
      : wallLabelCandidate
        ? (labelToIdLookup.get(wallLabelCandidate.trim().toLowerCase()) ?? null)
        : null;

  if (!wallId || !room.walls.some((wall) => wall.id === wallId && wall.kind !== "thin-wall")) {
    return null;
  }

  const role =
    candidate.role === "primary" ||
    candidate.role === "secondary" ||
    candidate.role === "storage" ||
    candidate.role === "upper-focus"
      ? candidate.role
      : "secondary";

  return {
    wallId,
    role,
    placeSink: toBoolean(candidate.placeSink),
    sinkCatalogId:
      typeof candidate.sinkCatalogId === "string" ? candidate.sinkCatalogId : null,
    placePantry: toBoolean(candidate.placePantry),
    pantryCatalogId:
      typeof candidate.pantryCatalogId === "string" ? candidate.pantryCatalogId : null,
    placeHood: toBoolean(candidate.placeHood),
    upperFeatureCatalogId:
      typeof candidate.upperFeatureCatalogId === "string"
        ? candidate.upperFeatureCatalogId
        : null,
    upperDistanceFromFloorInches: toNullableNumber(candidate.upperDistanceFromFloorInches),
    upperFeatureDistanceFromFloorInches: toNullableNumber(
      candidate.upperFeatureDistanceFromFloorInches
    ),
    skipBaseRun:
      Array.isArray(candidate.basePattern) && toStringArray(candidate.basePattern).length === 0,
    skipUpperRun:
      Array.isArray(candidate.upperPattern) && toStringArray(candidate.upperPattern).length === 0,
    basePattern: toStringArray(candidate.basePattern),
    upperPattern: toStringArray(candidate.upperPattern),
    notes: toStringArray(candidate.notes),
  };
}

function normalizeSmartKitchenPlan(
  room: AiRoomInput,
  rawPlan: unknown,
  plannerModel: string
): SmartKitchenPlan {
  const thickWallIds = room.walls
    .filter((wall) => wall.kind !== "thin-wall")
    .map((wall) => wall.id);

  if (!rawPlan || typeof rawPlan !== "object") {
    return {
      layoutType: thickWallIds.length <= 1 ? "single-wall" : "galley",
      wallOrder: thickWallIds,
      wallPlans: [],
      notes: [],
      plannerModel,
    };
  }

  const candidate = rawPlan as Record<string, unknown>;
  const normalizedWallPlans = (Array.isArray(candidate.wallPlans) ? candidate.wallPlans : [])
    .map((wallPlan) => normalizeWallPlan(room, wallPlan))
    .filter((wallPlan): wallPlan is SmartKitchenWallPlan => Boolean(wallPlan));

  const plannedWallIds = new Set(normalizedWallPlans.map((wallPlan) => wallPlan.wallId));
  const wallOrder = [
    ...toStringArray(candidate.wallOrder).filter((wallId) => thickWallIds.includes(wallId)),
    ...thickWallIds.filter((wallId) => !toStringArray(candidate.wallOrder).includes(wallId)),
  ];

  const layoutType =
    candidate.layoutType === "single-wall" ||
    candidate.layoutType === "galley" ||
    candidate.layoutType === "l-shape"
      ? candidate.layoutType
      : wallOrder.length <= 1
        ? "single-wall"
        : plannedWallIds.size >= 2
          ? "l-shape"
          : "galley";

  return {
    layoutType,
    wallOrder,
    wallPlans: normalizedWallPlans,
    notes: toStringArray(candidate.notes),
    plannerModel,
  };
}

function summarizeRoom(room: AiRoomInput) {
  const wallLabelLookup = getWallLabelLookup(room);
  return room.walls
    .filter((wall) => wall.kind !== "thin-wall")
    .map((wall) => {
      const dx = Math.abs(wall.end.x - wall.start.x);
      const dy = Math.abs(wall.end.y - wall.start.y);
      const lengthInches =
        (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) / room.meta.gridSize) *
        12;
      const midpoint = {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2,
      };
      const directionLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1;
      const direction = {
        x: (wall.end.x - wall.start.x) / directionLength,
        y: (wall.end.y - wall.start.y) / directionLength,
      };

      return {
        wallId: wall.id,
        wallLabel: wallLabelLookup.get(wall.id) ?? wall.id,
        lengthInches: Math.round(lengthInches * 10) / 10,
        orientation: dx >= dy ? "horizontal" : "vertical",
        windows: room.windows
          .filter((windowItem) => windowItem.wallId === wall.id)
          .map((windowItem) => ({
            widthInches: Math.round((windowItem.width / room.meta.gridSize) * 12 * 10) / 10,
            heightInches: windowItem.heightInches,
            distanceFromFloorInches: windowItem.distanceFromFloorInches,
          })),
        doors: room.doors
          .filter((doorItem) => doorItem.wallId === wall.id)
          .map((doorItem) => ({
            widthInches: Math.round((doorItem.width / room.meta.gridSize) * 12 * 10) / 10,
            heightInches: doorItem.heightInches,
            distanceFromFloorInches: doorItem.distanceFromFloorInches,
          })),
        prePlacedObjects: room.cabinets
          .filter((cabinetItem) => cabinetItem.wallId === wall.id)
          .map((cabinetItem) => {
            const catalogItem =
              room.catalog.find((item) => item.id === cabinetItem.catalogId) ?? null;
            const centerOffsetInches =
              (((cabinetItem.center.x - midpoint.x) * direction.x +
                (cabinetItem.center.y - midpoint.y) * direction.y) /
                room.meta.gridSize) *
              12;
            const widthInches =
              Math.round(((cabinetItem.width / room.meta.gridSize) * 12) * 10) / 10;
            const heightInches =
              cabinetItem.heightInches ?? catalogItem?.defaultHeightInches ?? null;
            const distanceFromFloorInches =
              cabinetItem.distanceFromFloorInches ??
              catalogItem?.defaultDistanceFromFloorInches ??
              0;

            return {
              id: cabinetItem.id,
              catalogId: cabinetItem.catalogId ?? null,
              title: catalogItem?.title ?? "Placed object",
              category: cabinetItem.category ?? catalogItem?.category ?? "base",
              image: cabinetItem.image ?? catalogItem?.image ?? null,
              isProduct: cabinetItem.isProduct ?? catalogItem?.isProduct ?? false,
              widthInches,
              depthInches:
                Math.round(((cabinetItem.depth / room.meta.gridSize) * 12) * 10) / 10,
              heightInches,
              distanceFromFloorInches,
              centerOffsetInches: Math.round(centerOffsetInches * 10) / 10,
              spanStartInches: Math.round((centerOffsetInches - widthInches / 2) * 10) / 10,
              spanEndInches: Math.round((centerOffsetInches + widthInches / 2) * 10) / 10,
              sinkFixture: cabinetItem.sinkFixture ?? false,
              cooktopFixture: cabinetItem.cooktopFixture ?? null,
            };
          }),
      };
    });
}

function summarizeCatalog(room: AiRoomInput) {
  return room.catalog.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    widthInches: item.widthInches,
    depthInches: item.depthInches,
    image: item.image,
    isProduct: item.isProduct ?? false,
    productCategory: item.productCategory ?? null,
    defaultHeightInches: item.defaultHeightInches ?? null,
    defaultDistanceFromFloorInches: item.defaultDistanceFromFloorInches ?? null,
  }));
}

function buildFallbackSmartLayout(params: {
  room: AiRoomInput;
  selectedWallIds?: string[];
  plannerModel: string;
  planNotes?: string[];
  designerFeedback?: string;
  plannerFailureReason: string;
}) {
  const fallbackLayout = generateKitchenLayout(params.room, {
    selectedWallIds: params.selectedWallIds,
  });

  return {
    ...fallbackLayout,
    summary: {
      ...fallbackLayout.summary,
      generationMethod: "smart-ai" as const,
      plannerModel: params.plannerModel,
      notes: [
        "The smart planner could not produce a usable structured plan, so the rule-based kitchen generator was used as a fallback.",
        params.plannerFailureReason,
        ...(params.designerFeedback
          ? ["Designer feedback was included in the smart-planning request."]
          : []),
        ...(params.planNotes ?? []),
        ...fallbackLayout.summary.notes,
      ],
    },
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it to your environment before using Generate smart kitchen.",
      },
      { status: 400 }
    );
  }

  let body: SmartKitchenRequestBody;

  try {
    body = (await request.json()) as SmartKitchenRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!body.room) {
    return NextResponse.json({ error: "Missing room input." }, { status: 400 });
  }

  const selectedWallIds = body.selectedWallIds?.length ? body.selectedWallIds : undefined;
  const roomForGeneration = filterRoomForKitchenGeneration(body.room, selectedWallIds);
  const designerFeedback =
    typeof body.designerFeedback === "string" ? body.designerFeedback.trim() : "";

  if (roomForGeneration.walls.length === 0) {
    return NextResponse.json(
      { error: "No thick walls were available for smart kitchen generation." },
      { status: 400 }
    );
  }

  const plannerModel = process.env.OPENAI_SMART_KITCHEN_MODEL ?? "gpt-5.5";
  const summarizedWalls = summarizeRoom(roomForGeneration);
  const summarizedCatalog = summarizeCatalog(roomForGeneration);
  const plannerInput = {
    selectedWallIds: selectedWallIds ?? roomForGeneration.walls.map((wall) => wall.id),
    selectedWallLabels: summarizedWalls.map((wall) => wall.wallLabel),
    walls: summarizedWalls,
    catalog: summarizedCatalog,
    designerFeedback: designerFeedback || null,
  };

  const plannerInstructions = [
    "You are a kitchen designer planning a real-life kitchen layout.",
    "Return JSON only.",
    "Keep the JSON compact and complete.",
    "Use the provided cabinet catalog IDs exactly when selecting cabinets.",
    "Choose the wall order, sink wall, optional tall-unit placement, upper cabinet strategy, and cabinet patterns so the kitchen feels practical, balanced, realistic, and attractive in both floor plan and especially elevation view.",
    "Treat pre-placed objects as fixed. Do not move, replace, or overlap them.",
    "Respect door and window openings. Do not block doors. Avoid placing uppers across windows unless the wall should simply stay open.",
    "It is valid to leave a wall partly or fully empty when the openings, preserved objects, or composition make that the better choice.",
    "Optimize for a polished customer-facing elevation: balanced compositions, sensible alignments, good negative space, and intentional framing around ranges, windows, refrigerators, ovens, and tall units.",
    "Tall pantry or other tall storage is optional, not required. Only use it when it improves the design.",
    "Wall cabinets may use different mounting heights on different walls when that improves the elevation composition.",
    "Use real-life kitchen composition instincts such as sink-under-window opportunities, balanced framing around major appliances, and sensible work-zone spacing.",
    "If the user provided designer feedback, treat it as high-priority guidance unless it would cause collisions or block an opening.",
    "Keep notes very short: at most 2 overall notes and at most 2 notes per wall.",
    "Prefer concise cabinet patterns. Do not over-explain.",
    "Avoid inventing unavailable cabinet IDs.",
    "Keep notes concise and practical.",
  ].join(" ");

  const plannerResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: plannerModel,
      reasoning: {
        effort: "medium",
      },
      max_output_tokens: 5000,
      text: {
        format: {
          type: "json_object",
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: plannerInstructions,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                task:
                  "Plan a smart kitchen using the selected walls and the available cabinet catalog.",
                outputShape: {
                  layoutType: "single-wall | galley | l-shape",
                  wallOrder: ["wall-id-1", "wall-id-2"],
                  notes: ["overall design note"],
                  wallPlans: [
                    {
                      wallId: "wall id",
                      role: "primary | secondary | storage | upper-focus",
                      placeSink: true,
                      sinkCatalogId: "catalog id or null",
                      placePantry: false,
                      pantryCatalogId: "catalog id or null",
                      placeHood: true,
                      upperFeatureCatalogId: "catalog id or null",
                      upperDistanceFromFloorInches: 54,
                      upperFeatureDistanceFromFloorInches: 54,
                      basePattern: ["catalog-id", "catalog-id"],
                      upperPattern: ["catalog-id"],
                      notes: ["short wall-specific note"],
                    },
                  ],
                },
                importantRules: [
                  "If a wall should not receive new base cabinets, set basePattern to [] and keep placeSink/placePantry false.",
                  "If a wall should not receive new upper cabinets, set upperPattern to [] and keep placeHood false.",
                  "Pre-placed objects are already on the selected walls and must stay in place.",
                  "Use the provided wallLabel values such as Wall 1 and Wall 2 to understand designer feedback.",
                  "Return wallId when possible. wallLabel is also accepted if needed.",
                  "Keep the response compact so the JSON finishes completely.",
                ],
                plannerInput,
              }),
            },
          ],
        },
      ],
    }),
  });

  if (!plannerResponse.ok) {
    const errorText = await plannerResponse.text();

    return NextResponse.json(
      {
        error: `OpenAI planning request failed: ${errorText}`,
      },
      { status: 502 }
    );
  }

  const plannerPayload = (await plannerResponse.json()) as OpenAIResponsesPayload;
  const plannerText = getResponseText(plannerPayload);

  if (!plannerText) {
    return NextResponse.json({
      layout: buildFallbackSmartLayout({
        room: roomForGeneration,
        selectedWallIds,
        plannerModel,
        designerFeedback,
        plannerFailureReason:
          "The smart planner returned no usable output text.",
      }),
      usedFallback: true,
      plannerError: "The smart planner returned no usable output text.",
    });
  }

  let rawPlan: unknown;
  let plannerParseError: string | null = null;

  try {
    rawPlan = parsePlannerJson(plannerText);
  } catch (error) {
    plannerParseError =
      error instanceof Error
        ? error.message
        : "The parser could not recover a usable plan from the model output.";
    return NextResponse.json({
      layout: buildFallbackSmartLayout({
        room: roomForGeneration,
        selectedWallIds,
        plannerModel,
        designerFeedback,
        plannerFailureReason: `The smart planner returned invalid JSON. ${plannerParseError}`,
      }),
      usedFallback: true,
      plannerError: `The smart planner returned invalid JSON. ${plannerParseError}`,
    });
  }

  const plan = normalizeSmartKitchenPlan(roomForGeneration, rawPlan, plannerModel);
  const smartLayout = generateSmartKitchenLayout(roomForGeneration, plan, {
    selectedWallIds,
  });

  if (smartLayout.cabinets.length > 0) {
    return NextResponse.json({
      layout: designerFeedback
        ? {
            ...smartLayout,
            summary: {
              ...smartLayout.summary,
              notes: [
                "Designer feedback was applied to this smart kitchen concept.",
                ...smartLayout.summary.notes,
              ],
            },
          }
        : smartLayout,
      plan,
    });
  }

  const fallbackLayout = generateKitchenLayout(roomForGeneration, {
    selectedWallIds,
  });

  return NextResponse.json({
    layout: {
      ...fallbackLayout,
      summary: {
        ...fallbackLayout.summary,
        generationMethod: "smart-ai",
        plannerModel,
        notes: [
          ...(designerFeedback
            ? ["Designer feedback was applied to this smart kitchen concept."]
            : []),
          "The smart planner produced a plan, but the engine could not realize it cleanly, so the rule-based generator was used as a fallback.",
          ...plan.notes,
          ...fallbackLayout.summary.notes,
        ],
      },
    },
    plan,
    usedFallback: true,
  });
}
