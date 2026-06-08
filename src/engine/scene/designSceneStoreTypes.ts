import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { WallSettings } from "@/engine/walls/wallTypes";
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
import type { AssemblyDragState } from "./sceneDragTypes";

export type AssemblyDimensionId = "widthInches" | "depthInches" | "heightInches";

export type DesignSceneStore = Readonly<{
  designScene: DesignScene;
  wallSettings: WallSettings;
  workspaceMode: KitchenWorkspaceMode;
  activeSceneViewMode: SceneViewMode;
  activeWallElevationWallId: string | null;
  activeWallElevationEdgeIndex: number;
  activeToolbarTool: SceneEditingTool | null;
  cameraCommand: SceneCameraCommand | null;
  sceneCameraStates: SceneCameraStates;
  activeDrag: AssemblyDragState | null;
  setWorkspaceMode: (workspaceMode: KitchenWorkspaceMode) => void;
  setActiveSceneViewMode: (sceneViewMode: SceneViewMode) => void;
  setActiveWallElevationWall: (placedWallId: string) => void;
  showPreviousWallElevationSide: () => void;
  showNextWallElevationSide: () => void;
  runCameraCommand: (cameraCommandTool: SceneCameraCommandTool) => void;
  clearCameraCommand: (cameraCommandId: number) => void;
  setActiveToolbarTool: (toolbarTool: SceneEditingTool | null) => void;
  updatePerspectiveCameraState: (cameraState: PerspectiveCameraState) => void;
  updateFloorPlanCameraState: (cameraState: OrthographicCameraState) => void;
  updateElevationCameraState: (cameraState: ElevationCameraState) => void;
  startAssemblyPlacementCandidate: (placedAssembly: PlacedAssembly) => void;
  updateAssemblyCandidateWorldPosition: (worldPositionInches: Point3DInches) => void;
  commitAssemblyPlacementCandidate: () => void;
  cancelActiveSceneOperation: () => void;
  selectPlacedAssembly: (placedAssemblyId: string) => void;
  selectPlacedWall: (placedWallId: string) => void;
  clearSelection: () => void;
  startAssemblyDrag: (args: {
    assemblyId: string;
    pointerWorldInches: Point3DInches;
    sceneViewMode: SceneViewMode;
  }) => void;
  updateAssemblyDrag: (pointerWorldInches: Point3DInches) => void;
  finishAssemblyDrag: () => void;
  cancelAssemblyDrag: () => void;
  deleteSelectedAssembly: () => void;
  updateSelectedAssemblyWorldPositionX: (xInches: number) => void;
  updateSelectedAssemblyWorldPositionY: (yInches: number) => void;
  updateSelectedAssemblyDistanceFromFloor: (distanceFromFloorInches: number) => void;
  updateSelectedAssemblyRotationZ: (zDegrees: number) => void;
  updateSelectedAssemblyDimension: (dimensionId: AssemblyDimensionId, valueInches: number) => void;
  updateSelectedAssemblyOptionValue: (optionId: string, value: AssemblyOptionValue) => void;
  updateWallFootprintDraftHover: (pointInches: Point3DInches) => void;
  clickWallFootprintDraftPoint: (pointInches: Point3DInches) => void;
  exitWallFootprintDraftTool: () => void;
  updateWallSplitDraftHover: (pointInches: Point3DInches) => void;
  clickWallSplitDraftPoint: (pointInches: Point3DInches) => void;
  exitWallSplitDraftTool: () => void;
  updateSelectedPlacedWallHeight: (heightInches: number) => void;
  updateSelectedPlacedWallViewableEdge: (edgeIndex: number, isViewable: boolean) => void;
  deleteSelectedPlacedWall: () => void;
  clearActiveInteraction: () => void;
}>;

export type DesignSceneStoreGetter = () => DesignSceneStore;

export type DesignSceneStoreSetter = (
  partial:
    | Partial<DesignSceneStore>
    | ((state: DesignSceneStore) => Partial<DesignSceneStore>),
) => void;
