import type { KitchenAiGeneratedSceneEntity, KitchenAiInput, KitchenAiOutput } from "./kitchenAiTypes";

export type KitchenAiOutputValidationResult = Readonly<{
  output: KitchenAiOutput | null;
  errors: readonly string[];
  warnings: readonly string[];
}>;

const allowedReservationPurposes = new Set(["corner", "filler", "panel", "clearance", "leftover"]);
const disallowedGeneratedDefinitionIdFragments = [
  "filler",
  "panel",
  "countertop",
  "refrigerator",
  "range-appliance",
  "dishwasher",
  "faucet",
  "cooktop",
  "oven",
  "microwave",
  "hood",
  "left-blind",
  "right-blind",
  "lazy-susan",
];

export function parseKitchenAiOutputJson(jsonText: string): KitchenAiOutputValidationResult {
  try {
    const output = JSON.parse(jsonText) as unknown;

    return validateKitchenAiOutputShape(output);
  } catch (error) {
    return {
      output: null,
      errors: [error instanceof Error ? error.message : "AI output is not valid JSON."],
      warnings: [],
    };
  }
}

export function validateKitchenAiOutputForInput(args: {
  aiInput: KitchenAiInput;
  aiOutput: KitchenAiOutput;
  existingSceneEntityIds?: ReadonlySet<string>;
}): KitchenAiOutputValidationResult {
  const shapeResult = validateKitchenAiOutputShape(args.aiOutput);

  if (shapeResult.output === null) {
    return shapeResult;
  }

  const errors = [...shapeResult.errors];
  const warnings = [...shapeResult.warnings];
  const catalogDefinitionIds = new Set(args.aiInput.catalog.map((item) => item.definitionId));
  const ids = new Set<string>();

  if (args.aiOutput.sourceRequestId !== args.aiInput.requestId) {
    warnings.push("AI output sourceRequestId does not match the current input requestId.");
  }

  args.aiOutput.scenePatch.addSceneEntities.forEach((entity, index) => {
    if (ids.has(entity.id)) {
      errors.push(`Duplicate generated entity id "${entity.id}".`);
    }

    if (args.existingSceneEntityIds?.has(entity.id) === true) {
      errors.push(`Generated entity id "${entity.id}" already exists in the current scene. This output has likely already been imported.`);
    }

    ids.add(entity.id);

    if (entity.entityKind === "placed-assembly") {
      if (!catalogDefinitionIds.has(entity.definitionId)) {
        errors.push(`Generated placed assembly ${index} uses definitionId "${entity.definitionId}" that is not in input.catalog.`);
      }

      if (disallowedGeneratedDefinitionIdFragments.some((fragment) => entity.definitionId.toLowerCase().includes(fragment))) {
        errors.push(`Generated placed assembly ${entity.id} uses disallowed definitionId "${entity.definitionId}".`);
      }

      validateSize(entity.configuration?.sizeInches, `placed assembly ${entity.id}`, errors);
      validateGeneratedCabinetStandardWidth({
        aiInput: args.aiInput,
        entity,
        errors,
      });
      validatePlacement(entity, `placed assembly ${entity.id}`, errors);
    } else if (entity.entityKind === "design-reservation-zone") {
      if (!allowedReservationPurposes.has(entity.reservedFor)) {
        errors.push(`Generated reservation zone ${entity.id} uses disallowed reservedFor "${entity.reservedFor}".`);
      }

      validateSize(entity.sizeInches, `reservation zone ${entity.id}`, errors);
      validatePlacement(entity, `reservation zone ${entity.id}`, errors);
      validateReservationPurposeSemantics(entity, errors, args.aiInput.rules.negligibleLeftoverThresholdInches);
    }
  });

  validateGeneratedFillersMatchCornerTargets({
    aiInput: args.aiInput,
    generatedSceneEntities: args.aiOutput.scenePatch.addSceneEntities,
    errors,
  });

  validateNoLeftoverTouchingRunAnchors({
    generatedSceneEntities: args.aiOutput.scenePatch.addSceneEntities,
    errors,
  });

  validateNoSandwichedLeftoverInAnchoredRun({
    generatedSceneEntities: args.aiOutput.scenePatch.addSceneEntities,
    warnings,
  });

  validateExposedEndpointPanelPlacement({
    aiInput: args.aiInput,
    generatedSceneEntities: args.aiOutput.scenePatch.addSceneEntities,
    errors,
  });

  return {
    output: errors.length === 0 ? args.aiOutput : null,
    errors,
    warnings,
  };
}

type GeneratedReservationZone = Extract<KitchenAiGeneratedSceneEntity, { entityKind: "design-reservation-zone" }>;

type ExpectedCornerFillerTarget = Readonly<{
  id: string;
  layer: "base" | "wall";
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: string;
  cornerEnd: "left" | "right";
  resolutionKind: "corner-with-fillers" | "single-side-filler";
  leftBoundInches: number;
  rightBoundInches: number;
  cornerWidthInches: number;
  depthInches: number;
  heightInches: number;
  centerVerticalInches: number;
  allowedWidthsInches: readonly number[];
}>;

type WallFillerRange = Readonly<{
  id: string;
  layer: "base" | "wall";
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: string;
  leftInches: number;
  rightInches: number;
}>;

type WallReservationRange = Readonly<{
  id: string;
  reservedFor: GeneratedReservationZone["reservedFor"];
  layer: "base" | "wall";
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: string;
  leftInches: number;
  rightInches: number;
}>;

type WallCabinetRange = Readonly<{
  id: string;
  layer: "base" | "wall";
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: string;
  leftInches: number;
  rightInches: number;
}>;

const RANGE_TOLERANCE_INCHES = 0.1;
const LEFTOVER_SANDWICH_TOLERANCE_INCHES = 0.2;
const EXPOSED_END_PANEL_WIDTH_INCHES = 1.5;
const EXPOSED_ENDPOINT_TOLERANCE_INCHES = 0.25;


function validateReservationPurposeSemantics(
  zone: GeneratedReservationZone,
  errors: string[],
  negligibleLeftoverThresholdInches: number,
): void {
  const widthInches = zone.sizeInches.widthInches;
  const idAndReason = `${zone.id} ${zone.reason ?? ""}`.toLowerCase();

  if (zone.reservedFor === "clearance") {
    if (widthInches < 3 - RANGE_TOLERANCE_INCHES) {
      errors.push(
        `Generated clearance reservation zone ${zone.id} has width ${widthInches}. Clearance is for intentional required empty space, such as the 3 inch range hood side clearance. Use reservedFor "leftover" for unresolved cabinet-run gaps smaller than a required clearance.`,
      );
    }

    if (idAndReason.includes("leftover")) {
      errors.push(
        `Generated clearance reservation zone ${zone.id} appears to describe a leftover gap. Use reservedFor "leftover" for unresolved cabinet-run remainder.`,
      );
    }
  }

  if (zone.reservedFor === "panel") {
    if (Math.abs(widthInches - EXPOSED_END_PANEL_WIDTH_INCHES) > RANGE_TOLERANCE_INCHES) {
      errors.push(
        `Generated panel reservation zone ${zone.id} has width ${widthInches}. Exposed-end panel reservation zones must be ${EXPOSED_END_PANEL_WIDTH_INCHES} inches wide. Use reservedFor "leftover" only for unresolved space outside the panel.`,
      );
    }

    const layer = getReservationZoneLayer(zone);

    if (layer === "base") {
      if (Math.abs(zone.sizeInches.depthInches - 24) > RANGE_TOLERANCE_INCHES || Math.abs(zone.sizeInches.heightInches - 34.5) > RANGE_TOLERANCE_INCHES) {
        errors.push(
          `Generated base panel reservation zone ${zone.id} must use depth 24 and height 34.5.`,
        );
      }
    } else if (layer === "wall") {
      if (Math.abs(zone.sizeInches.depthInches - 12) > RANGE_TOLERANCE_INCHES || Math.abs(zone.sizeInches.heightInches - 30) > RANGE_TOLERANCE_INCHES) {
        errors.push(
          `Generated wall panel reservation zone ${zone.id} must use depth 12 and height 30.`,
        );
      }
    }
  }

  if (zone.reservedFor === "leftover" && widthInches <= negligibleLeftoverThresholdInches + 0.01) {
    errors.push(
      `Generated leftover reservation zone ${zone.id} has width ${widthInches}. Leftover widths less than or equal to ${negligibleLeftoverThresholdInches} inches are visually negligible and should not be generated. The design should still prefer exact 0 inch leftover whenever possible.`,
    );
  }
}

function validateGeneratedFillersMatchCornerTargets(args: {
  aiInput: KitchenAiInput;
  generatedSceneEntities: readonly KitchenAiGeneratedSceneEntity[];
  errors: string[];
}): void {
  const expectedTargets = getExpectedCornerFillerTargets(args.aiInput);
  const matchedTargetIds = new Map<string, string>();
  const fillerZones = args.generatedSceneEntities.filter(
    (entity): entity is GeneratedReservationZone => entity.entityKind === "design-reservation-zone" && entity.reservedFor === "filler",
  );

  fillerZones.forEach((zone) => {
    if (zone.wallElevationAttachment === undefined) {
      args.errors.push(
        `Generated filler reservation zone ${zone.id} is invalid. Filler zones are only allowed as wall-attached corner filler anchors.`,
      );
      return;
    }

    const matchingTarget = expectedTargets.find((target) => matchesExpectedCornerFillerTarget(zone, target));

    if (matchingTarget === undefined) {
      args.errors.push(
        `Generated filler reservation zone ${zone.id} does not match an exported corner filler target. For this MVP, fillers are only allowed for full-corner or one-sided-corner handling. Use panel for exposed sides and leftover for unresolved run space.`,
      );
      return;
    }

    const previousMatchId = matchedTargetIds.get(matchingTarget.id);

    if (previousMatchId !== undefined) {
      args.errors.push(
        `Generated filler reservation zones ${previousMatchId} and ${zone.id} both match the same corner filler anchor ${matchingTarget.id}. Adjust that one filler anchor width to 3, 4, 5, or 6 inches instead of creating duplicate fillers.`,
      );
      return;
    }

    matchedTargetIds.set(matchingTarget.id, zone.id);
  });

  validateNoAdjacentFillerZones({
    fillerZones,
    errors: args.errors,
  });
}

function getExpectedCornerFillerTargets(aiInput: KitchenAiInput): readonly ExpectedCornerFillerTarget[] {
  return aiInput.wallCorners.flatMap((wallCorner) => [wallCorner.baseResolution, wallCorner.wallResolution].flatMap((resolution) => {
    if (resolution === null) {
      return [];
    }

    return resolution.fillerZones.flatMap((fillerZone, index) => {
      const anchor = fillerZone.anchor;

      if (anchor?.kind !== "corner-filler-anchor") {
        return [];
      }

      const wallFace = aiInput.wallFaces.find(
        (candidate) =>
          candidate.wallGraphId === fillerZone.wallElevationAttachment.wallGraphId &&
          candidate.wallSegmentId === fillerZone.wallElevationAttachment.wallSegmentId &&
          candidate.faceSide === fillerZone.wallElevationAttachment.faceSide,
      );

      if (wallFace === undefined) {
        return [];
      }

      return [{
        id: `${wallCorner.id}-${resolution.layer}-${resolution.resolutionKind}-filler-${index}`,
        layer: resolution.layer,
        wallGraphId: fillerZone.wallElevationAttachment.wallGraphId,
        wallSegmentId: fillerZone.wallElevationAttachment.wallSegmentId,
        faceSide: fillerZone.wallElevationAttachment.faceSide,
        cornerEnd: anchor.cornerEnd,
        resolutionKind: resolution.resolutionKind,
        leftBoundInches: wallFace.elevationFrame.horizontalBoundsInches.leftInches,
        rightBoundInches: wallFace.elevationFrame.horizontalBoundsInches.rightInches,
        cornerWidthInches: resolution.cornerZone?.sizeInches.widthInches ?? 0,
        depthInches: fillerZone.sizeInches.depthInches,
        heightInches: fillerZone.sizeInches.heightInches,
        centerVerticalInches: fillerZone.wallElevationAttachment.centerVerticalInches,
        allowedWidthsInches: anchor.allowedWidthsInches,
      } satisfies ExpectedCornerFillerTarget];
    });
  }));
}

function matchesExpectedCornerFillerTarget(zone: GeneratedReservationZone, target: ExpectedCornerFillerTarget): boolean {
  if (zone.wallElevationAttachment === undefined) {
    return false;
  }

  const layer = getReservationZoneLayer(zone);
  const widthInches = zone.sizeInches.widthInches;

  if (layer !== target.layer) {
    return false;
  }

  if (
    zone.wallElevationAttachment.wallGraphId !== target.wallGraphId ||
    zone.wallElevationAttachment.wallSegmentId !== target.wallSegmentId ||
    zone.wallElevationAttachment.faceSide !== target.faceSide
  ) {
    return false;
  }

  if (!target.allowedWidthsInches.some((allowedWidthInches) => Math.abs(allowedWidthInches - widthInches) < RANGE_TOLERANCE_INCHES)) {
    return false;
  }

  if (Math.abs(zone.sizeInches.depthInches - target.depthInches) > RANGE_TOLERANCE_INCHES) {
    return false;
  }

  if (Math.abs(zone.sizeInches.heightInches - target.heightInches) > RANGE_TOLERANCE_INCHES) {
    return false;
  }

  if (Math.abs(zone.wallElevationAttachment.centerVerticalInches - target.centerVerticalInches) > RANGE_TOLERANCE_INCHES) {
    return false;
  }

  const expectedCenterHorizontalInches = getExpectedCornerFillerCenterHorizontalInches({
    target,
    widthInches,
  });

  return Math.abs(zone.wallElevationAttachment.centerHorizontalInches - expectedCenterHorizontalInches) <= RANGE_TOLERANCE_INCHES;
}

function getExpectedCornerFillerCenterHorizontalInches(args: {
  target: ExpectedCornerFillerTarget;
  widthInches: number;
}): number {
  return args.target.cornerEnd === "right"
    ? args.target.rightBoundInches - args.target.cornerWidthInches - args.widthInches / 2
    : args.target.leftBoundInches + args.target.cornerWidthInches + args.widthInches / 2;
}

function validateNoAdjacentFillerZones(args: {
  fillerZones: readonly GeneratedReservationZone[];
  errors: string[];
}): void {
  const fillerRanges = args.fillerZones
    .filter((zone): zone is GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> } => zone.wallElevationAttachment !== undefined)
    .map(createWallFillerRange)
    .filter((range): range is WallFillerRange => range !== null);

  fillerRanges.forEach((firstRange, firstIndex) => {
    fillerRanges.slice(firstIndex + 1).forEach((secondRange) => {
      if (!areRangesOnSameWallLayer(firstRange, secondRange)) {
        return;
      }

      if (!rangesTouchOrOverlap(firstRange, secondRange)) {
        return;
      }

      args.errors.push(
        `Generated filler reservation zones ${firstRange.id} and ${secondRange.id} touch or overlap. Filler zones are corner anchors; adjust one anchor width to 3, 4, 5, or 6 inches instead of creating adjacent filler zones.`,
      );
    });
  });
}

function validateNoLeftoverTouchingRunAnchors(args: {
  generatedSceneEntities: readonly KitchenAiGeneratedSceneEntity[];
  errors: string[];
}): void {
  const wallReservationRanges = args.generatedSceneEntities
    .filter((entity): entity is GeneratedReservationZone => entity.entityKind === "design-reservation-zone")
    .filter((zone) => zone.reservedFor === "leftover" || zone.reservedFor === "filler" || zone.reservedFor === "clearance")
    .filter((zone): zone is GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> } => zone.wallElevationAttachment !== undefined)
    .map(createWallReservationRange)
    .filter((range): range is WallReservationRange => range !== null);

  const leftoverRanges = wallReservationRanges.filter((range) => range.reservedFor === "leftover");
  const anchorRanges = wallReservationRanges.filter((range) => range.reservedFor === "filler" || range.reservedFor === "clearance");

  leftoverRanges.forEach((leftoverRange) => {
    anchorRanges.forEach((anchorRange) => {
      if (!areRangesOnSameWallLayer(leftoverRange, anchorRange)) {
        return;
      }

      if (!rangesTouchOrOverlap(leftoverRange, anchorRange)) {
        return;
      }

      args.errors.push(
        `Generated leftover reservation zone ${leftoverRange.id} touches ${anchorRange.reservedFor} anchor ${anchorRange.id}. Cabinet runs must touch filler and clearance anchors; move unresolved leftover to the opposite endpoint or choose a better standard-width cabinet combination.`,
      );
    });
  });
}

function validateNoSandwichedLeftoverInAnchoredRun(args: {
  generatedSceneEntities: readonly KitchenAiGeneratedSceneEntity[];
  warnings: string[];
}): void {
  const wallReservationRanges = args.generatedSceneEntities
    .filter((entity): entity is GeneratedReservationZone => entity.entityKind === "design-reservation-zone")
    .filter((zone) => zone.reservedFor === "leftover" || zone.reservedFor === "filler" || zone.reservedFor === "clearance")
    .filter((zone): zone is GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> } => zone.wallElevationAttachment !== undefined)
    .map(createWallReservationRange)
    .filter((range): range is WallReservationRange => range !== null);
  const cabinetRanges = args.generatedSceneEntities
    .filter((entity): entity is Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }> => entity.entityKind === "placed-assembly")
    .filter((entity): entity is Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }> & { wallElevationAttachment: NonNullable<KitchenAiGeneratedSceneEntity["wallElevationAttachment"]> } => entity.wallElevationAttachment !== undefined)
    .map(createWallCabinetRange)
    .filter((range): range is WallCabinetRange => range !== null);

  const leftoverRanges = wallReservationRanges.filter((range) => range.reservedFor === "leftover");
  const anchorRanges = wallReservationRanges.filter((range) => range.reservedFor === "filler" || range.reservedFor === "clearance");

  leftoverRanges.forEach((leftoverRange) => {
    const sameLayerCabinets = cabinetRanges.filter((cabinetRange) => areRangesOnSameWallLayer(leftoverRange, cabinetRange));
    const leftCabinet = sameLayerCabinets.find((cabinetRange) => Math.abs(cabinetRange.rightInches - leftoverRange.leftInches) <= LEFTOVER_SANDWICH_TOLERANCE_INCHES);
    const rightCabinet = sameLayerCabinets.find((cabinetRange) => Math.abs(cabinetRange.leftInches - leftoverRange.rightInches) <= LEFTOVER_SANDWICH_TOLERANCE_INCHES);

    if (leftCabinet === undefined || rightCabinet === undefined) {
      return;
    }

    const sameLayerAnchors = anchorRanges.filter((anchorRange) => areRangesOnSameWallLayer(leftoverRange, anchorRange));
    const hasAnchorToLeft = sameLayerAnchors.some((anchorRange) => anchorRange.rightInches <= leftCabinet.leftInches + RANGE_TOLERANCE_INCHES);
    const hasAnchorToRight = sameLayerAnchors.some((anchorRange) => anchorRange.leftInches >= rightCabinet.rightInches - RANGE_TOLERANCE_INCHES);

    if (!hasAnchorToLeft || !hasAnchorToRight) {
      return;
    }

    args.warnings.push(
      `Generated leftover reservation zone ${leftoverRange.id} is sandwiched between cabinet assemblies ${leftCabinet.id} and ${rightCabinet.id} inside an anchored run. Prefer solving the full anchor-to-anchor span as one cabinet sequence, including alternate standard-width combinations and allowed corner filler widths, before accepting a visible middle leftover.`,
    );
  });
}


function validateExposedEndpointPanelPlacement(args: {
  aiInput: KitchenAiInput;
  generatedSceneEntities: readonly KitchenAiGeneratedSceneEntity[];
  errors: string[];
}): void {
  const cabinetRanges = args.generatedSceneEntities
    .filter((entity): entity is Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }> => entity.entityKind === "placed-assembly")
    .filter((entity): entity is Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }> & { wallElevationAttachment: NonNullable<KitchenAiGeneratedSceneEntity["wallElevationAttachment"]> } => entity.wallElevationAttachment !== undefined)
    .map(createWallCabinetRange)
    .filter((range): range is WallCabinetRange => range !== null);

  const reservationRanges = args.generatedSceneEntities
    .filter((entity): entity is GeneratedReservationZone => entity.entityKind === "design-reservation-zone")
    .filter((zone): zone is GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> } => zone.wallElevationAttachment !== undefined)
    .map(createWallReservationRange)
    .filter((range): range is WallReservationRange => range !== null);

  const panelRanges = reservationRanges.filter((range) => range.reservedFor === "panel");
  const anchorRanges = reservationRanges.filter((range) => range.reservedFor === "filler" || range.reservedFor === "clearance");

  args.aiInput.wallFaces.forEach((wallFace) => {
    (["base", "wall"] as const).forEach((layer) => {
      const sameLayerCabinets = cabinetRanges
        .filter((range) =>
          range.layer === layer &&
          range.wallGraphId === wallFace.wallGraphId &&
          range.wallSegmentId === wallFace.wallSegmentId &&
          range.faceSide === wallFace.faceSide,
        )
        .sort((first, second) => first.leftInches - second.leftInches);

      if (sameLayerCabinets.length === 0) {
        return;
      }

      validateExposedEndpointPanelForSide({
        side: "left",
        endpointInches: wallFace.elevationFrame.horizontalBoundsInches.leftInches,
        firstCabinet: sameLayerCabinets[0],
        wallFace,
        layer,
        panelRanges,
        anchorRanges,
        errors: args.errors,
      });

      validateExposedEndpointPanelForSide({
        side: "right",
        endpointInches: wallFace.elevationFrame.horizontalBoundsInches.rightInches,
        firstCabinet: sameLayerCabinets[sameLayerCabinets.length - 1],
        wallFace,
        layer,
        panelRanges,
        anchorRanges,
        errors: args.errors,
      });
    });
  });
}

function validateExposedEndpointPanelForSide(args: {
  side: "left" | "right";
  endpointInches: number;
  firstCabinet: WallCabinetRange;
  wallFace: KitchenAiInput["wallFaces"][number];
  layer: "base" | "wall";
  panelRanges: readonly WallReservationRange[];
  anchorRanges: readonly WallReservationRange[];
  errors: string[];
}): void {
  const endpointAnchored = args.anchorRanges.some((range) =>
    range.layer === args.layer &&
    range.wallGraphId === args.wallFace.wallGraphId &&
    range.wallSegmentId === args.wallFace.wallSegmentId &&
    range.faceSide === args.wallFace.faceSide &&
    (args.side === "left"
      ? Math.abs(range.leftInches - args.endpointInches) <= EXPOSED_ENDPOINT_TOLERANCE_INCHES
      : Math.abs(range.rightInches - args.endpointInches) <= EXPOSED_ENDPOINT_TOLERANCE_INCHES),
  );

  if (endpointAnchored) {
    return;
  }

  const cabinetSideInches = args.side === "left" ? args.firstCabinet.leftInches : args.firstCabinet.rightInches;
  const panelTouchingCabinet = args.panelRanges.some((range) =>
    range.layer === args.layer &&
    range.wallGraphId === args.wallFace.wallGraphId &&
    range.wallSegmentId === args.wallFace.wallSegmentId &&
    range.faceSide === args.wallFace.faceSide &&
    Math.abs(range.rightInches - range.leftInches - EXPOSED_END_PANEL_WIDTH_INCHES) <= RANGE_TOLERANCE_INCHES &&
    (args.side === "left"
      ? Math.abs(range.rightInches - cabinetSideInches) <= EXPOSED_ENDPOINT_TOLERANCE_INCHES && range.leftInches >= args.endpointInches - EXPOSED_ENDPOINT_TOLERANCE_INCHES
      : Math.abs(range.leftInches - cabinetSideInches) <= EXPOSED_ENDPOINT_TOLERANCE_INCHES && range.rightInches <= args.endpointInches + EXPOSED_ENDPOINT_TOLERANCE_INCHES),
  );

  if (panelTouchingCabinet) {
    return;
  }

  const cabinetNearEndpoint = args.side === "left"
    ? cabinetSideInches - args.endpointInches <= EXPOSED_END_PANEL_WIDTH_INCHES + 12
    : args.endpointInches - cabinetSideInches <= EXPOSED_END_PANEL_WIDTH_INCHES + 12;

  if (!cabinetNearEndpoint) {
    return;
  }

  args.errors.push(
    `Generated ${args.layer} cabinet ${args.firstCabinet.id} has an exposed ${args.side} endpoint on wall face ${args.wallFace.id} without a 1.5 inch panel touching the cabinet side. Use reservedFor "panel" for the exposed side, then place any leftover outside the panel toward the open endpoint.`,
  );
}

function createWallFillerRange(
  zone: GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> },
): WallFillerRange | null {
  const layer = getReservationZoneLayer(zone);

  if (layer === null) {
    return null;
  }

  const halfWidthInches = zone.sizeInches.widthInches / 2;

  return {
    id: zone.id,
    layer,
    wallGraphId: zone.wallElevationAttachment.wallGraphId,
    wallSegmentId: zone.wallElevationAttachment.wallSegmentId,
    faceSide: zone.wallElevationAttachment.faceSide,
    leftInches: zone.wallElevationAttachment.centerHorizontalInches - halfWidthInches,
    rightInches: zone.wallElevationAttachment.centerHorizontalInches + halfWidthInches,
  };
}

function createWallCabinetRange(
  entity: Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }> & { wallElevationAttachment: NonNullable<KitchenAiGeneratedSceneEntity["wallElevationAttachment"]> },
): WallCabinetRange | null {
  const layer = getPlacedAssemblyLayer(entity);

  if (layer === null) {
    return null;
  }

  const widthInches = entity.configuration.sizeInches.widthInches;
  const halfWidthInches = widthInches / 2;

  return {
    id: entity.id,
    layer,
    wallGraphId: entity.wallElevationAttachment.wallGraphId,
    wallSegmentId: entity.wallElevationAttachment.wallSegmentId,
    faceSide: entity.wallElevationAttachment.faceSide,
    leftInches: entity.wallElevationAttachment.centerHorizontalInches - halfWidthInches,
    rightInches: entity.wallElevationAttachment.centerHorizontalInches + halfWidthInches,
  };
}

function createWallReservationRange(
  zone: GeneratedReservationZone & { wallElevationAttachment: NonNullable<GeneratedReservationZone["wallElevationAttachment"]> },
): WallReservationRange | null {
  const layer = getReservationZoneLayer(zone);

  if (layer === null) {
    return null;
  }

  const halfWidthInches = zone.sizeInches.widthInches / 2;

  return {
    id: zone.id,
    reservedFor: zone.reservedFor,
    layer,
    wallGraphId: zone.wallElevationAttachment.wallGraphId,
    wallSegmentId: zone.wallElevationAttachment.wallSegmentId,
    faceSide: zone.wallElevationAttachment.faceSide,
    leftInches: zone.wallElevationAttachment.centerHorizontalInches - halfWidthInches,
    rightInches: zone.wallElevationAttachment.centerHorizontalInches + halfWidthInches,
  };
}

function getPlacedAssemblyLayer(
  entity: Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }>,
): "base" | "wall" | null {
  const sizeInches = entity.configuration.sizeInches;

  if (Math.abs(sizeInches.depthInches - 24) < RANGE_TOLERANCE_INCHES && Math.abs(sizeInches.heightInches - 34.5) < RANGE_TOLERANCE_INCHES) {
    return "base";
  }

  if (Math.abs(sizeInches.depthInches - 12) < RANGE_TOLERANCE_INCHES) {
    return "wall";
  }

  if (entity.wallElevationAttachment !== undefined) {
    if (Math.abs(entity.wallElevationAttachment.centerVerticalInches - 17.25) < RANGE_TOLERANCE_INCHES) {
      return "base";
    }

    if (Math.abs(entity.wallElevationAttachment.centerVerticalInches - 69) < RANGE_TOLERANCE_INCHES) {
      return "wall";
    }
  }

  return null;
}

function getReservationZoneLayer(zone: GeneratedReservationZone): "base" | "wall" | null {
  if (Math.abs(zone.sizeInches.depthInches - 24) < RANGE_TOLERANCE_INCHES && Math.abs(zone.sizeInches.heightInches - 34.5) < RANGE_TOLERANCE_INCHES) {
    return "base";
  }

  if (Math.abs(zone.sizeInches.depthInches - 12) < RANGE_TOLERANCE_INCHES) {
    return "wall";
  }

  if (zone.wallElevationAttachment !== undefined) {
    if (Math.abs(zone.wallElevationAttachment.centerVerticalInches - 17.25) < RANGE_TOLERANCE_INCHES) {
      return "base";
    }

    if (Math.abs(zone.wallElevationAttachment.centerVerticalInches - 69) < RANGE_TOLERANCE_INCHES) {
      return "wall";
    }
  }

  return null;
}

function areRangesOnSameWallLayer(firstRange: WallFillerRange, secondRange: WallFillerRange): boolean {
  return firstRange.layer === secondRange.layer &&
    firstRange.wallGraphId === secondRange.wallGraphId &&
    firstRange.wallSegmentId === secondRange.wallSegmentId &&
    firstRange.faceSide === secondRange.faceSide;
}

function rangesTouchOrOverlap(firstRange: WallFillerRange, secondRange: WallFillerRange): boolean {
  return firstRange.leftInches <= secondRange.rightInches + RANGE_TOLERANCE_INCHES &&
    secondRange.leftInches <= firstRange.rightInches + RANGE_TOLERANCE_INCHES;
}

function validateGeneratedCabinetStandardWidth(args: {
  aiInput: KitchenAiInput;
  entity: Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }>;
  errors: string[];
}): void {
  const catalogItem = args.aiInput.catalog.find((item) => item.definitionId === args.entity.definitionId);

  if (catalogItem === undefined) {
    return;
  }

  const widthInches = args.entity.configuration?.sizeInches?.widthInches;

  if (typeof widthInches !== "number" || !Number.isFinite(widthInches)) {
    return;
  }

  const allowedWidthsInches = catalogItem.allowedWidthsInches.length > 0
    ? catalogItem.allowedWidthsInches
    : [catalogItem.defaultSizeInches.widthInches];
  const usesStandardWidth = allowedWidthsInches.some((allowedWidthInches) => Math.abs(allowedWidthInches - widthInches) < 0.01);

  if (!usesStandardWidth) {
    args.errors.push(
      `Generated placed assembly ${args.entity.id} uses non-standard width ${widthInches}. Allowed widths for ${catalogItem.definitionId}: ${allowedWidthsInches.join(", ")}. Use a panel or leftover reservation zone for leftover run space instead of resizing the cabinet. Fillers are only corner anchors and clearance is only for intentional required clearance.`,
    );
  }
}

function validateKitchenAiOutputShape(output: unknown): KitchenAiOutputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(output)) {
    return { output: null, errors: ["AI output must be a JSON object."], warnings };
  }

  if (output.schemaVersion !== "kitchen-ai-output/v1") {
    errors.push("AI output schemaVersion must be kitchen-ai-output/v1.");
  }

  if (typeof output.sourceRequestId !== "string") {
    errors.push("AI output sourceRequestId must be a string.");
  }

  if (output.status !== "success" && output.status !== "partial" && output.status !== "failed") {
    errors.push("AI output status must be success, partial, or failed.");
  }

  if (typeof output.designSummary !== "string") {
    errors.push("AI output designSummary must be a string.");
  }

  if (!isRecord(output.scenePatch)) {
    errors.push("AI output scenePatch must be an object.");
  } else {
    if (!Array.isArray(output.scenePatch.addSceneEntities)) {
      errors.push("AI output scenePatch.addSceneEntities must be an array.");
    } else {
      output.scenePatch.addSceneEntities.forEach((entity, index) => {
        validateGeneratedEntityShape(entity, index, errors);
      });
    }

    if (!Array.isArray(output.scenePatch.updateSceneEntities) || output.scenePatch.updateSceneEntities.length !== 0) {
      errors.push("AI output scenePatch.updateSceneEntities must be an empty array.");
    }

    if (!Array.isArray(output.scenePatch.deleteSceneEntityIds) || output.scenePatch.deleteSceneEntityIds.length !== 0) {
      errors.push("AI output scenePatch.deleteSceneEntityIds must be an empty array.");
    }
  }

  if (!Array.isArray(output.validationNotes)) {
    errors.push("AI output validationNotes must be an array.");
  }

  return {
    output: errors.length === 0 ? output as KitchenAiOutput : null,
    errors,
    warnings,
  };
}

function validateGeneratedEntityShape(entity: unknown, index: number, errors: string[]): void {
  if (!isRecord(entity)) {
    errors.push(`Generated entity ${index} must be an object.`);
    return;
  }

  if (typeof entity.id !== "string" || entity.id.length === 0) {
    errors.push(`Generated entity ${index} is missing id.`);
  }

  if (entity.entityKind !== "placed-assembly" && entity.entityKind !== "design-reservation-zone") {
    errors.push(`Generated entity ${index} has invalid entityKind.`);
  }

  if (entity.entityKind === "placed-assembly") {
    if (typeof entity.definitionId !== "string") {
      errors.push(`Generated placed assembly ${index} is missing definitionId.`);
    }

    if (!isRecord(entity.configuration)) {
      errors.push(`Generated placed assembly ${index} is missing configuration.`);
    }
  }

  if (entity.entityKind === "design-reservation-zone") {
    if (typeof entity.reservedFor !== "string") {
      errors.push(`Generated reservation zone ${index} is missing reservedFor.`);
    }
  }
}

function validateSize(size: unknown, label: string, errors: string[]): void {
  if (!isRecord(size)) {
    errors.push(`${label} is missing sizeInches.`);
    return;
  }

  ["widthInches", "depthInches", "heightInches"].forEach((field) => {
    if (!isFinitePositiveNumber(size[field])) {
      errors.push(`${label} sizeInches.${field} must be a positive finite number.`);
    }
  });
}

function validatePlacement(entity: KitchenAiGeneratedSceneEntity, label: string, errors: string[]): void {
  const hasWallAttachment = entity.wallElevationAttachment !== undefined;
  const hasCornerAttachment = entity.entityKind === "design-reservation-zone" && entity.cornerAttachment !== undefined;
  const hasZoneAttachment = entity.zoneAttachment !== undefined;
  const hasWorldTransform = entity.worldPositionInches !== undefined && entity.rotationDegrees !== undefined;

  if (!hasWallAttachment && !hasCornerAttachment && !hasZoneAttachment && !hasWorldTransform) {
    errors.push(`${label} must have wallElevationAttachment, cornerAttachment, zoneAttachment, or worldPositionInches + rotationDegrees.`);
  }
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
