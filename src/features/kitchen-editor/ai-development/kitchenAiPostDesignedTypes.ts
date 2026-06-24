import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type {
  KitchenAiCornerAttachment,
  KitchenAiWallElevationAttachment,
  KitchenAiZoneAttachment,
} from "../ai/kitchenAiTypes";

export type KitchenAiPostDesignedSchemaVersion = "kitchen-ai-postdesigned/v1";
export type KitchenAiPostDesignedStatus = "success" | "partial" | "failed";
export type KitchenAiPostDesignedImageViewType = "wall-face" | "corner";

export type KitchenAiPostDesignedImagePlan = Readonly<{
  id: string;
  viewType: KitchenAiPostDesignedImageViewType;
  label: string;
  wallFaceId?: string;
  cornerId?: string;
  includedSceneEntityIds: readonly string[];
  cameraInstruction: string;
}>;

export type KitchenAiDevelopmentGeneratedPlacedAssembly = Readonly<{
  id: string;
  entityKind: "placed-assembly";
  definitionId: string;
  semanticRole?: string;
  configuration: {
    sizeInches: Size3DInches;
    optionValues?: Readonly<Record<string, AssemblyOptionValue>>;
  };
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
  zoneAttachment?: KitchenAiZoneAttachment;
  worldPositionInches?: Point3DInches;
  rotationDegrees?: { zDegrees: number };
  reason?: string;
}>;

export type KitchenAiDevelopmentGeneratedReservationZone = Readonly<{
  id: string;
  entityKind: "design-reservation-zone";
  reservedFor: Extract<
    DesignReservationZonePurpose,
    "corner" | "filler" | "panel" | "clearance" | "leftover" | "island" | "peninsula" | "tall-pantry"
  >;
  sizeInches: Size3DInches;
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
  cornerAttachment?: KitchenAiCornerAttachment;
  zoneAttachment?: KitchenAiZoneAttachment;
  worldPositionInches?: Point3DInches;
  rotationDegrees?: { zDegrees: number };
  aiMeta?: Readonly<Record<string, unknown>>;
  reason?: string;
}>;

export type KitchenAiDevelopmentGeneratedSceneEntity =
  | KitchenAiDevelopmentGeneratedPlacedAssembly
  | KitchenAiDevelopmentGeneratedReservationZone;

export type KitchenAiPostDesignedScenePatch = Readonly<{
  addSceneEntities: readonly KitchenAiDevelopmentGeneratedSceneEntity[];
  updateSceneEntities: readonly KitchenAiDevelopmentGeneratedSceneEntity[];
  deleteSceneEntityIds: readonly string[];
}>;

export type KitchenAiPostDesignedRequirementSummary = Readonly<{
  satisfied: readonly string[];
  partial: readonly string[];
  failed: readonly string[];
}>;

export type KitchenAiPostDesigned = Readonly<{
  schemaVersion: KitchenAiPostDesignedSchemaVersion;
  sourceRequestId: string;
  status: KitchenAiPostDesignedStatus;
  designSummary: string;
  requirementSummary: KitchenAiPostDesignedRequirementSummary;
  scenePatch: KitchenAiPostDesignedScenePatch;
  imageGenerationPlan: readonly KitchenAiPostDesignedImagePlan[];
  validationNotes: readonly string[];
}>;
