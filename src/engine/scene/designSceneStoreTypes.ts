import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallSettings } from "@/engine/walls/placedWallSegmentTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type {
  AssemblyPlacementElevationFrame,
  AssemblyPlacementFeedback,
} from "@/engine/assemblies/placement/assemblyPlacementTypes";

import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";

import type { WallElevationFaceSideBySegmentKey } from "@/engine/walls/wallElevationFaceSideMemory";
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
import type { KitchenWorkspaceMode } from "./kitchenWorkspaceModeTypes";
import type { AssemblyDragState, AssemblyElevationMoveFrame } from "./sceneDragTypes";

export type AssemblyDimensionId = "widthInches" | "depthInches" | "heightInches";

export type DesignSceneStore = Readonly<{
  designScene: DesignScene;
  wallSettings: WallSettings;
  workspaceMode: KitchenWorkspaceMode;
  activeSceneViewMode: SceneViewMode;
  activeWallElevationTarget: WallElevationTarget | null;
  activeWallElevationFaceSideBySegmentKey: WallElevationFaceSideBySegmentKey;
  activeToolbarTool: SceneEditingTool | null;
  cameraCommand: SceneCameraCommand | null;
  sceneCameraStates: SceneCameraStates;
  activeDrag: AssemblyDragState | null;
  assemblyPlacementFeedback: AssemblyPlacementFeedback | null;
  setWorkspaceMode: (workspaceMode: KitchenWorkspaceMode) => void;
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
  selectPlacedAssembly: (placedAssemblyId: string) => void;
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
  }) => void;
  updateAssemblyRotationDrag: (pointerWorldInches: Point3DInches) => void;
  finishAssemblyRotationDrag: () => void;
  cancelAssemblyRotationDrag: () => void;
  deleteSelectedAssembly: () => void;
  duplicateSelectedAssembly: () => void;
  updateSelectedAssemblyWorldPositionX: (xInches: number) => void;
  updateSelectedAssemblyWorldPositionY: (yInches: number) => void;
  updateSelectedAssemblyDistanceFromFloor: (distanceFromFloorInches: number) => void;
  updateSelectedAssemblyRotationZ: (zDegrees: number) => void;
  updateSelectedAssemblyDimension: (dimensionId: AssemblyDimensionId, valueInches: number) => void;
  updateSelectedAssemblyOptionValue: (optionId: string, value: AssemblyOptionValue) => void;
  updateWallSegmentDraftHover: (pointInches: Point3DInches) => void;
  clickWallSegmentDraftPoint: (pointInches: Point3DInches) => void;
  exitWallSegmentDraftTool: () => void;
  updateSelectedWallSegmentHeight: (heightInches: number) => void;
  updateSelectedWallSegmentThickness: (thicknessInches: number) => void;
  deleteSelectedWallSegment: () => void;
  clearActiveInteraction: () => void;
}>;


export type DesignSceneStoreGetter = () => DesignSceneStore;

export type DesignSceneStoreSetter = (
  partial:
    | Partial<DesignSceneStore>
    | ((state: DesignSceneStore) => Partial<DesignSceneStore>),
) => void;