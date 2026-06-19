export type SceneEditingTool = "draw-wall-segment" | "draw-design-reservation-zone";


export function isFloorPlanOnlySceneEditingTool(sceneEditingTool: SceneEditingTool | null): boolean {
  return sceneEditingTool === "draw-wall-segment";
}
