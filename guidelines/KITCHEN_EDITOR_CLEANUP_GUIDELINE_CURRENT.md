# Kitchen Editor Cleanup Guideline - Current

This guideline reflects the current Kitchen Editor code after the left AI chat panel, right editor panel, and DesignReservationZone update. Keep it aligned with the active code only. Do not preserve removed workspace-mode or designer-mode workflows.

## 1. Source of truth

`DesignScene` is the scene source of truth.

- There is one editable workspace.
- `SceneViewMode` controls how the same scene is viewed: perspective, floor plan, or elevation.
- The AI chat is a left side panel, not a separate workspace mode.
- The catalog/properties tools are a right side panel.
- Panel collapse state is local UI state in `KitchenWorkspaceShell`, not scene data.
- Do not duplicate scene data by panel state or view mode.

Current source-of-truth files:

```txt
src/engine/scene/designSceneTypes.ts
src/engine/scene/designSceneStore.ts
src/engine/scene/designSceneStoreTypes.ts
src/engine/scene/createInitialDesignSceneStoreState.ts
src/engine/scene/sceneSelectionTypes.ts
src/engine/scene/sceneOperationTypes.ts
src/engine/scene/sceneViewModeTypes.ts
src/engine/scene/sceneCameraStateTypes.ts
src/engine/design-zones/designReservationZoneTypes.ts
src/engine/design-zones/designReservationZoneDefaults.ts
src/engine/design-zones/designReservationZoneGeometry.ts
src/engine/design-zones/designReservationZoneAlignment.ts
src/engine/scene-entities/sceneEntityBoundsTypes.ts
src/engine/scene-entities/placedAssemblySceneEntityBounds.ts
src/engine/scene-entities/designReservationZoneSceneEntityBounds.ts
```

## 2. Engine and feature dependency boundary

`src/engine` must not import from `src/features`.

Dependency direction:

```txt
features/kitchen-editor -> engine -> core/shared primitives
```

Feature UI and AI export code may import engine scene, wall, assembly, countertop, and primitive geometry types. Engine files must not import feature UI, React components, renderer code, feature registry code, or store hooks from the feature layer.

## 3. Workspace layout and editing rules

The active workspace layout is:

```txt
left AI chat panel | center header/toolbar/canvas | right editor panel
```

Current workspace files:

```txt
src/features/kitchen-editor/workspace/KitchenWorkspaceShell.tsx
src/features/kitchen-editor/workspace/KitchenWorkspaceAiSidebar.tsx
src/features/kitchen-editor/workspace/KitchenWorkspaceSidebar.tsx
src/features/kitchen-editor/workspace/KitchenWorkspaceHeader.tsx
src/features/kitchen-editor/workspace/KitchenWorkspaceToolbar.tsx
src/features/kitchen-editor/workspace/WorkspacePanelCollapseButton.tsx
src/features/kitchen-editor/workspace/SceneViewModeTabs.tsx
```

Rules:

- The switch design/editor mode button is removed.
- Manual editing remains available while the AI panel is open.
- The left AI panel and right editor panel are independently collapsible.
- Collapsing either panel expands the center canvas area through CSS grid column changes.
- The right editor panel renders the catalog/properties UI.
- The left AI panel renders chat UI only: a scrollable context/message area plus a fixed bottom composer.
- Wall drawing remains a floor-plan-only editing workflow.
- DesignReservationZone drawing is available in perspective, floor plan, and elevation. It creates the same 3D scene entity in every view.
- Camera commands remain one-shot toolbar commands.

## 4. Wall cabinet face policy model

Wall segments use `cabinetPlacementFacePolicies` directly.

```ts
export type CabinetPlacementRequirement = "none" | "optional" | "required";

export type CabinetPlacementFacePolicies = Readonly<{
  "side-a": CabinetPlacementRequirement;
  "side-b": CabinetPlacementRequirement;
}>;
```

Default policy:

```ts
{
  "side-a": "none",
  "side-b": "required"
}
```

Meaning:

- `none`: AI must leave this wall face clear of generated kitchen objects.
- `optional`: AI may design on this wall face when useful.
- `required`: AI should design on this wall face unless impossible or explicitly relaxed by the user.

Current files:

```txt
src/engine/walls/placedWallSegmentTypes.ts
src/engine/walls/wallSegmentFaceSideSettings.ts
src/engine/walls/wallSegmentGraphEditing.ts
src/engine/scene/actions/wallEditingActions.ts
src/engine/scene/designSceneStoreTypes.ts
```

Rules:

- New wall segments receive `getDefaultWallSegmentCabinetPlacementFacePolicies()`.
- Split wall segments preserve the policy object from the segment being split.
- Runtime scene data should only use `cabinetPlacementFacePolicies`.
- Do not add alternate wall cabinet placement fields or side-list adapters.

## 5. Scene document contract

Scene documents use schema version:

```txt
kitchen-editor-scene/v3
```

Scene document wall segments must include:

```ts
cabinetPlacementFacePolicies: {
  "side-a": "none" | "optional" | "required";
  "side-b": "none" | "optional" | "required";
}
```

Current document files:

```txt
src/engine/scene/document/designSceneDocumentTypes.ts
src/engine/scene/document/createDesignSceneDocument.ts
src/engine/scene/document/createDesignSceneFromDocument.ts
src/engine/scene/document/parseDesignSceneDocument.ts
```

Rules:

- `createDesignSceneDocument.ts` writes `cabinetPlacementFacePolicies`.
- `createDesignSceneFromDocument.ts` reads `cabinetPlacementFacePolicies`.
- `parseDesignSceneDocument.ts` validates both side values as `none`, `optional`, or `required`.
- Missing or invalid policy data should be reported through the parser error path.
- Document logic should not introduce alternate field names for wall cabinet face placement.
- Scene documents use `kitchen-editor-scene/v3` and must include `designReservationZones`. Missing or invalid zone data must be reported through the parser error path.


## 6. Design reservation zones

`DesignReservationZone` is a scene source-of-truth entity used to tell the AI where to build an island, peninsula, or tall pantry. It is not a placed assembly and does not create wall or countertop cutouts.

Current files:

```txt
src/engine/design-zones/designReservationZoneTypes.ts
src/engine/design-zones/designReservationZoneDefaults.ts
src/engine/design-zones/designReservationZoneGeometry.ts
src/engine/design-zones/designReservationZoneAlignment.ts
src/engine/scene-entities/sceneEntityBoundsTypes.ts
src/engine/scene-entities/placedAssemblySceneEntityBounds.ts
src/engine/scene-entities/designReservationZoneSceneEntityBounds.ts
src/engine/scene/actions/designReservationZonePlacementActions.ts
src/engine/scene/actions/designReservationZoneDragActions.ts
src/engine/scene/actions/designReservationZoneRotationActions.ts
src/engine/scene/actions/designReservationZoneEditingActions.ts
src/features/kitchen-editor/interaction/design-zones/DesignReservationZonePlacementSurface.tsx
src/features/kitchen-editor/interaction/design-zones/DesignReservationZoneDragSurface.tsx
src/features/kitchen-editor/interaction/design-zones/DesignReservationZoneRotationSurface.tsx
src/features/kitchen-editor/rendering/design-zones/DesignReservationZoneLayer.tsx
src/features/kitchen-editor/rendering/design-zones/DesignReservationZoneRenderer.tsx
src/features/kitchen-editor/rendering/design-zones/DesignReservationZonePlacementCandidateRenderer.tsx
src/features/kitchen-editor/rendering/design-zones/SelectedDesignReservationZoneOutlineLayer.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFootprintBoundingBox.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanEditControls.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanRotationControl.tsx
src/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides.ts
src/features/kitchen-editor/rendering/scene-entities/SceneEntityWallMeasurementGuides.tsx
src/features/kitchen-editor/properties-panel/design-zones/DesignReservationZonePropertiesPanel.tsx
```

Rules:

- The draw tool is `draw-design-reservation-zone`.
- The draw tool is enabled in perspective, floor plan, and elevation.
- Draw Reservation Zone uses a placement-candidate workflow in every view. The candidate appears under the pointer, snaps like an object, shows shared alignment/wall-measurement feedback, and commits on click.
- Normal perspective/elevation zone volume rendering obeys scene depth and must not draw through walls.
- Elevation renders zones through the same scene-object view pipeline; floor-plan-only edit controls do not appear in elevation.
- Zones can be selected, deleted, moved, and edited from the properties panel in all scene views. Floor-plan rotation control remains the shared scene-entity rotation UI.
- Selected zone footprint, delete control, and floor-plan rotation control reuse the shared SceneEntity UI components used by placed assemblies. Reservation zones do not expose a duplicate action.
- Zone placement and movement use `SceneEntityBounds` for snapping. Assemblies and reservation zones can snap to assemblies, reservation zones, and walls.
- Selected, moving, and placement-candidate zones show wall distance measurement guides in floor plan using the shared SceneEntity wall measurement helper.
- Defaults are 72 × 36 × 34.5 for island/peninsula and 36 × 24 × 84 for tall pantry.
- Changing `reservedFor` applies that purpose's default dimensions in the scene action.
- The placement UI exposes X position, Y position, editable distance from floor, and rotation. `baseCenterPointInches.zInches` is the distance from floor and must not be normalized back to 0 after editing.
- The properties panel order is Reserved for, Placement, Dimensions, Actions. Actions contains Delete only.

- The reservation-zone creation flow must use the scene-entity placement candidate system. Use the scene-entity placement candidate pattern so reservation-zone placement mirrors assembly placement.
- Do not add reservation-zone-only selected UI, rotation UI, wall measurement math, or alignment math when the behavior can use `SceneEntityBounds` / shared scene-entity components.

## 7. Wall face settings UI

Editor wall properties expose per-face policy editing.

Current files:

```txt
src/features/kitchen-editor/properties-panel/walls/WallSegmentPropertiesPanel.tsx
src/features/kitchen-editor/properties-panel/walls/WallSegmentFaceSettingsSection.tsx
src/features/kitchen-editor/ai-panel/SelectedWallSummary.tsx
```

Editor UI labels:

```txt
No cabinets
Optional
Required
```

Rules:

- Editor properties may update selected wall face policies.
- AI panel selected wall summary may display policy values.
- Property input handlers should use `useDesignSceneStore.getState()` for action-only access when the action does not need to trigger render.

## 8. AI panel and AI input export

AI side panel files:

```txt
src/features/kitchen-editor/ai-panel/KitchenAiPanel.tsx
src/features/kitchen-editor/ai-panel/AiChatPanel.tsx
src/features/kitchen-editor/ai-panel/SelectedAssemblySummary.tsx
src/features/kitchen-editor/ai-panel/SelectedWallSummary.tsx
src/features/kitchen-editor/ai-panel/SelectedDesignReservationZoneSummary.tsx
```

AI side panel rules:

- The side panel renders chat UI only.
- Scene JSON export/import controls are not rendered in the left AI panel.
- Selection summaries live inside the scrollable chat/context area.
- The chat composer stays fixed at the bottom of the panel.
- Only the chat/context area scrolls when content is taller than the panel.

AI input export files:

```txt
src/features/kitchen-editor/ai-designer/ai-input-export/aiInputPackageTypes.ts
src/features/kitchen-editor/ai-designer/ai-input-export/createAiInputFiles.ts
src/features/kitchen-editor/ai-designer/ai-input-export/createCatalogReferencePackage.ts
src/features/kitchen-editor/ai-designer/ai-input-export/createDerivedPlacementHelpersPackage.ts
src/features/kitchen-editor/ai-designer/ai-input-export/downloadAiInputFolder.ts
src/features/kitchen-editor/ai-designer/ai-input-export/userRequestTemplate.ts
```

`createAiInputFiles.ts` exports these packages/files:

```txt
01-standard-instructions/*
02-current-scene-for-ai.json
03-catalog-reference.json
04-derived-placement-helpers.json
05-user-request-template.md
```

Rules:

- `02-current-scene-for-ai.json` is created from `createWallOnlyDesignSceneDocument(designScene)`.
- `03-catalog-reference.json` contains allowed catalog definition ids, dimensions, options, defaults, and cutout behavior.
- `04-derived-placement-helpers.json` contains wall face guides, cabinet corner guides, and design reservation zone guides derived from the current scene geometry.
- AI input export code may import engine wall/scene types and geometry builders.
- Engine code must not import AI export code.

## 9. Derived placement helper package

The derived placement helper package is built by:

```txt
src/features/kitchen-editor/ai-designer/ai-input-export/createDerivedPlacementHelpersPackage.ts
```

Package identity:

```ts
packageName: "derived-placement-helpers"
packageIndex: 4
```

Exported arrays:

```txt
wallFacePlacementGuides
cabinetCornerPlacementGuides
designReservationZoneGuides
```

`wallFacePlacementGuides` rules:

- Generate a guide only when a face policy is `optional` or `required`.
- Do not generate a guide when a face policy is `none`.
- Each guide includes wall graph id, wall segment id, face side, placement requirement, start/end points, run length, design-side normal, and object Z rotation.

`cabinetCornerPlacementGuides` rules:

- Generate a corner guide only when two generated wall face guides share a wall graph node and satisfy the current corner geometry checks.
- Supported corner angle range is controlled by `CORNER_MIN_ANGLE_DEGREES` and `CORNER_MAX_ANGLE_DEGREES` in `createDerivedPlacementHelpersPackage.ts`.
- The generated corner strategy is `blind-cabinet-with-adjacent-perpendicular-cabinet`.
- `cornerRequirement` is `required` only when both participating face guides are required; otherwise it is `optional`.
- Keep guide values in inches/degrees.

`designReservationZoneGuides` rules:

- Generate one guide for each `DesignReservationZone`.
- Include reserved type, base center, width/depth/height, rotation, base corners, top corners, local axes, and height range.
- Use these guides as AI build volumes, not physical scene objects.

## 10. AI instruction package

Current AI instruction files live in:

```txt
src/features/kitchen-editor/ai-designer/README.md
src/features/kitchen-editor/ai-designer/manifest.json
src/features/kitchen-editor/ai-designer/all-in-one-ai-kitchen-designer-instruction-prompt.md
src/features/kitchen-editor/ai-designer/standard-instructions/standardAiInstructionFiles.ts
src/features/kitchen-editor/ai-designer/standard-instructions/00-ai-kitchen-designer-orchestrator.md
src/features/kitchen-editor/ai-designer/standard-instructions/01-ai-scene-v3-input-output-contract.md
src/features/kitchen-editor/ai-designer/standard-instructions/02-catalog-definition-to-placed-assembly.md
src/features/kitchen-editor/ai-designer/standard-instructions/03-world-coordinate-and-object-orientation.md
src/features/kitchen-editor/ai-designer/standard-instructions/04-wall-graph-face-placement-rules.md
src/features/kitchen-editor/ai-designer/standard-instructions/05-run-interval-placement-and-spacing.md
src/features/kitchen-editor/ai-designer/standard-instructions/06-object-overlap-clearance-and-collision-validation.md
src/features/kitchen-editor/ai-designer/standard-instructions/07-panels-fillers-and-finished-ends.md
src/features/kitchen-editor/ai-designer/standard-instructions/08-corner-cabinet-and-corner-clearance-rules.md
src/features/kitchen-editor/ai-designer/standard-instructions/09-derived-cutout-source-placement-rules.md
src/features/kitchen-editor/ai-designer/standard-instructions/10-kitchen-design-principles-and-object-selection.md
src/features/kitchen-editor/ai-designer/standard-instructions/11-layout-strategy-by-wall-geometry.md
src/features/kitchen-editor/ai-designer/standard-instructions/12-appliance-and-fixture-placement.md
src/features/kitchen-editor/ai-designer/standard-instructions/13-pantry-tall-storage-and-stacked-cabinet-rules.md
src/features/kitchen-editor/ai-designer/standard-instructions/14-cabinet-layout-alignment-and-module-rhythm.md
src/features/kitchen-editor/ai-designer/standard-instructions/15-modern-kitchen-style-and-material-rules.md
src/features/kitchen-editor/ai-designer/standard-instructions/16-final-json-self-check.md
```

Rules:

- Instruction text must match the actual exported input contract.
- `standardAiInstructionFiles.ts` must stay synchronized with the markdown instruction files.
- The all-in-one prompt should be regenerated or edited when the standard instruction set changes.
- `manifest.json` must remain valid JSON.

## 11. Wall rendering and wall openings

Current wall rendering files:

```txt
src/features/kitchen-editor/rendering/walls/WallLayer.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentDraftRenderer.tsx
src/features/kitchen-editor/rendering/walls/WallPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningIntersectionOutlines.tsx
src/features/kitchen-editor/rendering/walls/WallElevationViewZoneOverlay.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentActiveOverlay.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentVertexMarkers.tsx
src/features/kitchen-editor/rendering/walls/WallAnchorRing.tsx
src/features/kitchen-editor/rendering/walls/guides/wallPlanGuideGeometry.ts
src/features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
src/features/kitchen-editor/rendering/walls/wallSegmentRenderColors.ts
```

Wall openings are derived from placed assemblies and positioned candidates that declare wall cutout behavior.

Current wall opening files:

```txt
src/engine/walls/openings/deriveWallOpeningsFromAssemblies.ts
src/engine/walls/openings/wallOpeningCutGeometry.ts
src/engine/walls/openings/wallOpeningFaceAxes.ts
src/engine/walls/openings/wallOpeningIntersectionOutlineGeometry.ts
src/engine/walls/openings/wallOpeningPlanGeometry.ts
src/engine/walls/openings/wallOpeningPlanMeasurements.ts
src/features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
src/features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
```

Rules:

- `WallSegmentMesh.tsx` must keep using opening-aware wall segment geometry.
- Wall opening derivation should receive the narrowed wall-opening assembly sources from `src/engine/scene/derivedCutoutAssemblySources.ts`.
- Candidate wall openings should be included only when the positioned candidate can produce a wall opening.
- Keep wall opening math in `src/engine/walls/openings`.

## 12. Countertop openings and cutouts

Countertop openings are derived from countertop slab hosts plus assemblies that declare countertop cutout behavior.

Current files:

```txt
src/engine/countertops/countertopDefinitionIds.ts
src/engine/countertops/deriveCountertopOpeningsFromAssemblies.ts
src/engine/countertops/applyCountertopOpeningsToAssemblyTree.ts
src/engine/countertops/countertopOpeningGeometry.ts
src/engine/countertops/countertopOpeningTypes.ts
src/engine/countertops/countertopRemovedAreaGeometry.ts
src/engine/countertops/countertopHoleGeometryStrategy.ts
src/engine/scene/derivedCutoutAssemblySources.ts
src/features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Rules:

- Keep countertop cutout math in `src/engine/countertops`.
- Keep countertop slab definition id in `countertopDefinitionIds.ts`.
- `deriveCountertopOpeningsFromAssemblies` should receive narrowed countertop-opening assembly sources.
- `applyHostCountertopOpeningsToAssemblyTree` should apply host openings without repeatedly checking unrelated opening maps at every child.
- Do not use rendering-only object bounds as cutout truth when engine cutout behavior is available.

## 13. Assembly placement and alignment

Assembly placement and object alignment are engine behavior.

Current public alignment entry:

```txt
src/engine/assemblies/placement/assemblyObjectAlignmentGuides.ts
```

Current placement/alignment files:

```txt
src/engine/assemblies/placement/assemblyPlacementFeedback.ts
src/engine/assemblies/placement/assemblyPlacementGeometry.ts
src/engine/assemblies/placement/assemblyPlacementPlanGeometry.ts
src/engine/assemblies/placement/assemblyPlacementTypes.ts
src/engine/assemblies/placement/assemblyRotationSnapping.ts
src/engine/assemblies/placement/assemblyWallMeasurementGuides.ts
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentConstants.ts
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentTypes.ts
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentFootprints.ts
src/engine/assemblies/placement/alignment/assemblyCountertopAlignmentGeometry.ts
src/engine/assemblies/placement/alignment/assemblyPlanObjectAlignment.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentTargets.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentCandidates.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentGuides.ts
src/engine/assemblies/placement/alignment/assemblyElevationObjectAlignment.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentBoxes.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentCandidates.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentGuides.ts
```

Rules:

- Keep plan alignment target building, candidate selection, and guide building in focused alignment files.
- Keep elevation alignment target boxes, candidate selection, and guide building in focused alignment files.
- Preserve snapping thresholds and scoring unless the task explicitly changes alignment behavior.
- Wall measurement guides for assembly placement belong in `assemblyWallMeasurementGuides.ts` and `AssemblyWallMeasurementGuides.tsx`.

## 14. Assembly rendering and interaction

Current assembly rendering files:

```txt
src/features/kitchen-editor/rendering/assemblies/AssemblyLayer.tsx
src/features/kitchen-editor/rendering/assemblies/PlacedAssemblyRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveMesh.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveEdgeSegments.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyFrontOutlineLines.tsx
src/features/kitchen-editor/rendering/assemblies/SelectedAssemblyOutlineLayer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPlacementCandidateRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPlacementFeedbackLayer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyWallMeasurementGuides.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyObjectAlignmentGuides.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFootprintBoundingBox.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanEditControls.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanRotationControl.tsx
src/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides.ts
src/features/kitchen-editor/rendering/scene-entities/SceneEntityWallMeasurementGuides.tsx
src/features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Responsibility split:

```txt
AssemblyLayer
- prepares assembly render items
- uses derived countertop opening maps
- uses render-local assembly tree caching through useAssemblyRenderItems

PlacedAssemblyRenderer
- owns placed assembly interaction once per assembly

AssemblyRenderer
- shared visual assembly renderer
- renders primitive meshes, edge segments, front outline lines, and optional root pointer handling

AssemblyPrimitiveMesh
- visual primitive mesh
- no scene store subscription
- no placed assembly drag/selection logic

AssemblyPlacementCandidateRenderer
- visual candidate rendering
- receives candidate assembly directly
```

Rules:

- Do not put store subscriptions or pointer drag logic into every primitive mesh.
- Reuse base built assembly trees when the `PlacedAssembly` object reference is unchanged.
- Reuse countertop-opening-applied trees when both the `PlacedAssembly` and that assembly's host countertop openings are unchanged.
- Keep assembly tree cache local to rendering unless an engine-level cache is intentionally designed.

## 15. Camera and elevation behavior

Current camera/view files:

```txt
src/features/kitchen-editor/editors/DesignSceneViewport.tsx
src/features/kitchen-editor/editors/shared/scene-canvas/DesignSceneCanvas.tsx
src/features/kitchen-editor/editors/shared/scene-canvas/DesignSceneRenderer.tsx
src/features/kitchen-editor/editors/shared/camera/cameraFit.ts
src/features/kitchen-editor/editors/shared/camera/orthographicCameraControls.ts
src/features/kitchen-editor/editors/shared/camera/sceneCameraControlSettings.ts
src/features/kitchen-editor/editors/shared/camera/sceneFitFrame.ts
src/features/kitchen-editor/editors/floor-plan/FloorPlanCameraControls.tsx
src/features/kitchen-editor/editors/perspective/PerspectiveCameraControls.tsx
src/features/kitchen-editor/editors/elevation/ElevationCameraControls.tsx
src/features/kitchen-editor/editors/elevation/ElevationViewPaddingMaskOverlay.tsx
src/features/kitchen-editor/editors/elevation/WallElevationNavigator.tsx
src/features/kitchen-editor/editors/elevation/elevationViewPaddingMaskFrame.ts
src/engine/walls/wallElevationCameraFrame.ts
src/engine/walls/wallElevationViewZone.ts
src/engine/walls/wallSegmentElevation.ts
src/engine/walls/wallSegmentElevationNavigation.ts
src/engine/walls/wallSegmentElevationTypes.ts
```

Rules:

- Camera state belongs to scene view mode.
- Collapsing or expanding panels must not reset camera state.
- Floor plan and perspective cameras compute scene fit frame when the user triggers fit view.
- Locked wall-face elevation camera should use wall elevation frame/view-zone data.
- Elevation view padding mask behavior should stay synchronized with the current wall elevation frame.
- Wall drawing should remain a floor-plan editing workflow.

## 16. Store selectors, callbacks, and render state

Selection lookup helpers:

```txt
src/features/kitchen-editor/selection/sceneSelectionLookups.ts
```

Rules:

- Editor and AI panels should subscribe directly to selected assembly/wall data they need.
- Avoid subscribing to action functions only to call them inside event handlers.
- Use `useDesignSceneStore.getState()` inside event handlers for action-only access when appropriate.
- Avoid passing or subscribing to the full `activeSceneOperation` object unless the component truly needs it.
- Prefer smaller derived values such as active operation kind, positioned placement candidate, wall segment draft, or booleans used for mounting/gating.
- Gate invisible interaction/render layers at the parent when it avoids unnecessary store subscriptions.

## 17. Geometry disposal and render-local resources

Shared disposal hook:

```txt
src/features/kitchen-editor/rendering/shared/useDisposableGeometry.ts
```

Use it for generated geometries owned by components, including custom primitive geometries, edge segment geometries, wall segment geometries, and view-zone overlay geometries.

React Three Fiber owns declarative JSX geometries such as `<boxGeometry />` and `<cylinderGeometry />`.

## 18. Unit and naming rules

Domain geometry uses inches.

Browser/render boundary values use pixels.

Use explicit suffixes where ambiguity exists:

```txt
Point3DInches
Size3DInches
CanvasSizePixels
pointerClientPixels
worldPositionInches
heightInches
```

Use scene-oriented names:

```txt
SceneViewMode
activeSceneViewMode
setActiveSceneViewMode
SceneCameraStates
sceneCameraStates
```

Use panel-oriented names for UI layout:

```txt
KitchenWorkspaceAiSidebar
KitchenWorkspaceSidebar
isAiPanelCollapsed
isEditorPanelCollapsed
```

Use kebab-case for string ids and normal TypeScript casing for variables, functions, types, and properties.

## 19. Active tools and camera commands

Camera commands are one-shot commands:

```txt
zoom-in
zoom-out
fit-view
```

Active scene editing tools are operation/tool modes:

```txt
draw-wall-segment
split-wall-footprint
draw-rectangle-cutout
draw-design-reservation-zone
```

Do not represent camera commands as active editing tools.

## 20. Verification checklist

Run the strongest checks available from the package.

When dependencies are installed:

```bash
npx tsc --noEmit
npm run build
npm run lint
```

Always run targeted checks before returning code:

```txt
confirm TypeScript/TSX files parse
confirm local imports resolve
confirm JSON files parse
confirm src/engine has no imports from src/features
confirm scene documents write cabinetPlacementFacePolicies and designReservationZones
confirm AI export includes wallFacePlacementGuides.placementRequirement
confirm AI export includes cabinetCornerPlacementGuides and designReservationZoneGuides
confirm manifest.json parses
confirm removed workspace-mode files are not referenced
```

Manual behavior checks after changes:

```txt
1. App opens directly in Kitchen Editor.
2. No design/editor mode switch button exists.
3. AI chat appears in the left panel while the scene remains editable.
4. Right catalog/properties panel is narrower than before.
5. Collapse the left AI panel and confirm the center canvas expands.
6. Collapse the right editor panel and confirm the center canvas expands.
7. Collapse both panels and confirm the center canvas uses the available width.
8. Expand panels again and confirm catalog/chat UI state is preserved.
9. Place a cabinet from the right catalog while the AI panel is open.
10. Drag a cabinet in floor plan while the AI panel is open.
11. Drag a cabinet in elevation while the AI panel is open.
12. Rotate a selected cabinet in floor plan.
13. Delete a selected object with keyboard.
14. Draw a wall segment only in floor plan.
15. Select wall segments and edit wall height/thickness/face policies.
16. Confirm selected wall elevation navigator works.
17. Confirm locked wall elevation view fits the view-zone rectangle.
18. Confirm padding mask covers outside the elevation view-zone.
19. Confirm floor plan zoom/fit works.
20. Confirm perspective pan/rotate/zoom/fit works.
21. Confirm camera states persist when switching views and collapsing panels.
22. Place a countertop slab plus drop-in sink/cooktop and confirm cutouts appear.
23. Move sink/cooktop and confirm cutouts follow.
24. Place wall window/door and confirm derived wall opening appears.
25. Activate Draw Reservation Zone in perspective, floor plan, and elevation and confirm a candidate preview appears under the pointer before click.
26. Confirm reservation-zone candidate snapping and wall measurement feedback are visible like assembly placement.
27. Confirm placed reservation zones select, move, snap, and show wall measurements in all supported views.
28. Confirm assemblies can snap to reservation-zone bounds and reservation zones can snap to assembly bounds.
25. Confirm selected properties panel edits placement/dimensions/options.
26. Confirm AI chat composer stays visible when the chat/context area has enough content to scroll.
```

## 21. Implementation standard

For cleanup work:

```txt
change the real source file
update every call site
delete replaced names and paths
avoid bridge files
avoid duplicate domain math
verify imports
run checks before packaging
```

For feature work:

```txt
keep implementation small and testable
preserve source-of-truth scene data
preserve derived wall/countertop cutout behavior unless the task changes it
preserve elevation view-zone/padding-mask behavior unless the task changes it
keep editor mutation behavior explicit
update this guideline when the code structure changes
```
