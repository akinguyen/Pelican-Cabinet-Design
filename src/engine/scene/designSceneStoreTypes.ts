import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { CabinetPlacementRequirement, WallFaceSide, WallSettings } from "@/engine/walls/placedWallSegmentTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type {
  AssemblyPlacementElevationFrame,
  AssemblyPlacementFeedback,
  AssemblyObjectAlignmentGuide,
} from "@/engine/assemblies/placement/assemblyPlacementTypes";

import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";

import type { SceneEditingTool } from "./sceneEditingToolTypes";
import type {
  SceneCameraCommand,
  SceneCameraCommandTool,
} from "@/engine/scene/sceneCameraCommandTypes";
import type {
  SceneCameraStates,
  ElevationCameraState,
  OrthographicCameraState,
  PerspectiveCameraState,
} from "@/engine/scene/sceneCameraStateTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { DesignScene } from "./designSceneTypes";
import type { SceneEntitySelectionRef } from "./sceneSelectionTypes";
import type { DesignSceneHistoryState } from "./sceneHistoryTypes";
import type { AssemblyElevationMoveFrame, SceneDragState } from "./sceneDragTypes";

export type AssemblyDimensionId = "widthInches" | "depthInches" | "heightInches";

export type DesignSceneStore = Readonly<{
  designScene: DesignScene;
  wallSettings: WallSettings;
  activeSceneViewMode: SceneViewMode;
  activeWallElevationTarget: WallElevationTarget | null;
  activeToolbarTool: SceneEditingTool | null;
  cameraCommand: SceneCameraCommand | null;
  sceneCameraStates: SceneCameraStates;
  activeDrag: SceneDragState | null;
  assemblyPlacementFeedback: AssemblyPlacementFeedback | null;
  activeObjectAlignmentGuides: readonly AssemblyObjectAlignmentGuide[];
  sceneHistory: DesignSceneHistoryState;
  setActiveSceneViewMode: (sceneViewMode: SceneViewMode) => void;
  setActiveWallElevationTarget: (target: WallElevationTarget) => void;
  showPreviousWallElevationSegment: () => void;
  showNextWallElevationSegment: () => void;
  showPreviousWallElevationSide: () => void;
  showNextWallElevationSide: () => void;
  runCameraCommand: (cameraCommandTool: SceneCameraCommandTool) => void;
  clearCameraCommand: (cameraCommandId: number) => void;
  setActiveToolbarTool: (toolbarTool: SceneEditingTool | null) => void;
  updatePerspectiveCameraState: (cameraState: PerspectiveCameraState) => void;
  updateFloorPlanCameraState: (cameraState: OrthographicCameraState) => void;
  updateElevationCameraState: (cameraState: ElevationCameraState) => void;
  startAssemblyPlacementCandidate: (placedAssembly: PlacedAssembly) => void;
  updateAssemblyCandidateWorldPosition: (
    worldPositionInches: Point3DInches,
    sceneViewMode: SceneViewMode,
    elevationMoveFrame?: AssemblyPlacementElevationFrame,
  ) => void;
  commitAssemblyPlacementCandidate: () => void;
  cancelActiveSceneOperation: () => void;
  selectSceneEntity: (sceneEntity: SceneEntitySelectionRef) => void;
  toggleSceneEntitySelection: (sceneEntity: SceneEntitySelectionRef) => void;
  selectPlacedWallSegment: (wallGraphId: string, wallSegmentId: string) => void;
  clearSelection: () => void;
  startAssemblyDrag: (args: {
    assemblyId: string;
    pointerWorldInches: Point3DInches;
    sceneViewMode: SceneViewMode;
    elevationMoveFrame?: AssemblyElevationMoveFrame;
  }) => void;
  updateAssemblyDrag: (pointerWorldInches: Point3DInches) => void;
  finishAssemblyDrag: () => void;
  cancelAssemblyDrag: () => void;
  startAssemblyRotationDrag: (args: {
    assemblyId: string;
    centerPointInches: Point3DInches;
    pointerWorldInches: Point3DInches;
    startHandleCenterAngleDegrees: number;
  }) => void;
  updateAssemblyRotationDrag: (pointerWorldInches: Point3DInches) => void;
  finishAssemblyRotationDrag: () => void;
  cancelAssemblyRotationDrag: () => void;
  deleteSelectedSceneEntities: () => void;
  duplicateSelectedSceneEntities: () => void;
  updateSelectedAssemblyWorldPositionX: (xInches: number) => void;
  updateSelectedAssemblyWorldPositionY: (yInches: number) => void;
  updateSelectedAssemblyDistanceFromFloor: (distanceFromFloorInches: number) => void;
  updateSelectedAssemblyRotationZ: (zDegrees: number) => void;
  updateSelectedAssemblyDimension: (dimensionId: AssemblyDimensionId, valueInches: number) => void;
  updateSelectedAssemblyOptionValue: (optionId: string, value: AssemblyOptionValue) => void;
  updateWallSegmentDraftHover: (pointInches: Point3DInches) => void;
  startDesignReservationZonePlacementCandidate: () => void;
  updateDesignReservationZonePlacementCandidate: (
    pointInches: Point3DInches,
    sceneViewMode: SceneViewMode,
    elevationMoveFrame?: AssemblyElevationMoveFrame,
  ) => void;
  commitDesignReservationZonePlacementCandidate: () => void;
  cancelDesignReservationZonePlacementCandidate: () => void;
  startDesignReservationZoneDrag: (args: {
    designReservationZoneId: string;
    pointerWorldInches: Point3DInches;
    sceneViewMode: SceneViewMode;
    elevationMoveFrame?: AssemblyElevationMoveFrame;
  }) => void;
  updateDesignReservationZoneDrag: (pointerWorldInches: Point3DInches) => void;
  finishDesignReservationZoneDrag: () => void;
  cancelDesignReservationZoneDrag: () => void;
  updateSceneEntityMultiDrag: (pointerWorldInches: Point3DInches) => void;
  finishSceneEntityMultiDrag: () => void;
  cancelSceneEntityMultiDrag: () => void;
  startDesignReservationZoneRotationDrag: (args: {
    designReservationZoneId: string;
    centerPointInches: Point3DInches;
    pointerWorldInches: Point3DInches;
    startHandleCenterAngleDegrees: number;
  }) => void;
  updateDesignReservationZoneRotationDrag: (pointerWorldInches: Point3DInches) => void;
  finishDesignReservationZoneRotationDrag: () => void;
  cancelDesignReservationZoneRotationDrag: () => void;
  updateSelectedDesignReservationZoneReservedFor: (reservedFor: DesignReservationZonePurpose) => void;
  updateSelectedDesignReservationZoneWidth: (widthInches: number) => void;
  updateSelectedDesignReservationZoneDepth: (depthInches: number) => void;
  updateSelectedDesignReservationZoneHeight: (heightInches: number) => void;
  updateSelectedDesignReservationZonePositionX: (xInches: number) => void;
  updateSelectedDesignReservationZonePositionY: (yInches: number) => void;
  updateSelectedDesignReservationZoneDistanceFromFloor: (distanceFromFloorInches: number) => void;
  updateSelectedDesignReservationZoneRotationZ: (zDegrees: number) => void;
  clickWallSegmentDraftPoint: (pointInches: Point3DInches) => void;
  exitWallSegmentDraftTool: () => void;
  updateSelectedWallSegmentHeight: (heightInches: number) => void;
  updateSelectedWallSegmentThickness: (thicknessInches: number) => void;
  updateWallSegmentPreferredViewFaceSide: (args: {
    wallGraphId: string;
    wallSegmentId: string;
    preferredViewFaceSide: WallFaceSide;
  }) => void;
  updateSelectedWallSegmentPreferredViewFaceSide: (preferredViewFaceSide: WallFaceSide) => void;
  updateSelectedWallSegmentCabinetPlacementFacePolicy: (faceSide: WallFaceSide, requirement: CabinetPlacementRequirement) => void;
  deleteSelectedWallSegment: () => void;
  clearActiveInteraction: () => void;
  undoDesignSceneChange: () => void;
  redoDesignSceneChange: () => void;
  restoreDesignSceneHistoryEntry: (historyEntryId: string) => void;
}>;


export type DesignSceneStoreGetter = () => DesignSceneStore;

export type DesignSceneStoreSetter = (
  partial:
    | Partial<DesignSceneStore>
    | ((state: DesignSceneStore) => Partial<DesignSceneStore>),
) => void;