import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { WallSettings } from "@/engine/walls/wallTypes";
import type {
  EditorActiveToolbarTool,
  EditorCameraCommand,
  EditorCameraCommandTool,
} from "@/features/kitchen-editor/editor-toolbar/editorToolbarTypes";
import type {
  EditorCameraStates,
  ElevationEditorCameraState,
  OrthographicEditorCameraState,
  PerspectiveEditorCameraState,
} from "@/features/kitchen-editor/editors/shared/editorCameraStateTypes";
import type { KitchenEditorView } from "@/features/kitchen-editor/editors/shared/editorViewTypes";
import type { DesignScene } from "./designSceneTypes";
import type { AssemblyDragState } from "./sceneDragTypes";

export type AssemblyDimensionId = "widthInches" | "depthInches" | "heightInches";

export type DesignSceneStore = Readonly<{
  designScene: DesignScene;
  wallSettings: WallSettings;
  activeEditorView: KitchenEditorView;
  activeWallElevationWallId: string | null;
  activeWallElevationEdgeIndex: number;
  activeToolbarTool: EditorActiveToolbarTool | null;
  cameraCommand: EditorCameraCommand | null;
  editorCameraStates: EditorCameraStates;
  activeDrag: AssemblyDragState | null;
  setActiveEditorView: (editorView: KitchenEditorView) => void;
  setActiveWallElevationWall: (placedWallId: string) => void;
  showPreviousWallElevationSide: () => void;
  showNextWallElevationSide: () => void;
  runCameraCommand: (toolbarTool: EditorCameraCommandTool) => void;
  clearCameraCommand: (cameraCommandId: number) => void;
  setActiveToolbarTool: (toolbarTool: EditorActiveToolbarTool | null) => void;
  updatePerspectiveCameraState: (cameraState: PerspectiveEditorCameraState) => void;
  updateFloorPlanCameraState: (cameraState: OrthographicEditorCameraState) => void;
  updateElevationCameraState: (cameraState: ElevationEditorCameraState) => void;
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
    editorView: KitchenEditorView;
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
