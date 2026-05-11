# Smart Kitchen AI Generation

This document explains how to use, test, and debug the Smart Kitchen AI generation feature.

## Overview

The Smart Kitchen AI feature helps generate a kitchen cabinet layout from a measured floor plan.

The intended workflow is:

1. A salesperson visits a customer home.
2. The salesperson measures the kitchen space.
3. The salesperson draws the room walls, openings, and basic layout in the editor.
4. The salesperson may place a few required, locked, or suggested cabinets/products.
5. The AI receives the room JSON and cabinet catalog.
6. The AI designs the rest of the kitchen.
7. The app validates and renders the returned cabinet placements.

The AI should not replace the final validation logic. The AI proposes a design, but the application should still validate wall fit, collisions, catalog IDs, door/window clearance, and rendering safety.

---

## API Route

The Smart Kitchen AI route is:

```txt
POST /api/smart-kitchen
```

In local development, the URL is usually:

```txt
http://localhost:3000/api/smart-kitchen
```

If port `3000` is already being used, the app may run on another port, for example:

```txt
http://127.0.0.1:3001/api/smart-kitchen
```

---

## Environment Variables

A real OpenAI API key is required for non-preview AI generation.

```bash
OPENAI_API_KEY=your_real_key
```

Optional debug logging:

```bash
DEBUG_SMART_KITCHEN=true
```

Example local run:

```bash
OPENAI_API_KEY=your_real_key DEBUG_SMART_KITCHEN=true npm run dev
```

If using a custom port:

```bash
OPENAI_API_KEY=your_real_key DEBUG_SMART_KITCHEN=true PORT=3001 npm run dev
```

---

## Main Request Body

The route expects a JSON body like this:

```ts
type SmartKitchenRequestBody = {
  room: AiRoomInput;
  selectedWallIds?: string[];
  designerFeedback?: string;
  previewOnly?: boolean;

  customerRequirements?: {
    layoutPreference?: string | null;
    stylePreference?: string | null;
    mustInclude?: unknown[];
    mustAvoid?: unknown[];
    notes?: string[];
  };

  designZones?: {
    plumbingWallIds?: string[];
    rangeWallIds?: string[];
    refrigeratorWallIds?: string[];
    preferredSinkWallIds?: string[];
  };
};
```

Minimum request:

```json
{
  "room": {
    "walls": [],
    "windows": [],
    "doors": [],
    "cabinets": [],
    "catalog": [],
    "wallChains": [],
    "meta": {}
  }
}
```

Typical request:

```json
{
  "room": {
    "walls": [],
    "windows": [],
    "doors": [],
    "cabinets": [],
    "catalog": [],
    "wallChains": [],
    "meta": {
      "coordinateUnit": "pixels",
      "measurementUnit": "inches",
      "gridSizePixelsPerFoot": 28,
      "wallThicknessPixels": 16
    }
  },
  "selectedWallIds": ["wall-1", "wall-2"],
  "designerFeedback": "Keep the refrigerator near the right corner and create a practical L-shaped kitchen.",
  "previewOnly": false
}
```

---

## Important Concept: `lockMode`

Cabinets/products placed by the salesperson can be marked with a `lockMode`.

```ts
lockMode: "locked" | "required" | "suggested"
```

### `locked`

Use this when the object must stay exactly where it is.

The AI must:

- not move it
- not replace it
- not overlap it
- design around it

Example:

```json
{
  "id": "locked-fridge",
  "catalogId": "product-refrigerator",
  "category": "base",
  "wallId": "wall-1",
  "wallFace": "left",
  "lockMode": "locked",
  "center": { "x": 300, "y": 300 },
  "rotation": 0,
  "width": 84,
  "depth": 70,
  "heightInches": 84,
  "distanceFromFloorInches": 0
}
```

### `required`

Use this when the object must appear in the final design, but the AI may adjust its exact position.

The AI must:

- include this object type/catalog item
- keep the intent
- reposition it if needed for a better or valid design

Example:

```json
{
  "id": "required-fridge",
  "catalogId": "product-refrigerator",
  "category": "base",
  "wallId": "wall-1",
  "wallFace": "left",
  "lockMode": "required",
  "center": { "x": 300, "y": 300 },
  "rotation": 0,
  "width": 84,
  "depth": 70,
  "heightInches": 84,
  "distanceFromFloorInches": 0
}
```

### `suggested`

Use this when the salesperson is giving the AI a starting idea only.

The AI may:

- use it
- move it
- replace it
- omit it

Example:

```json
{
  "id": "suggested-drawer",
  "catalogId": "base-drawer-cabinet",
  "category": "base",
  "wallId": "wall-1",
  "wallFace": "left",
  "lockMode": "suggested",
  "center": { "x": 300, "y": 300 },
  "rotation": 0,
  "width": 70,
  "depth": 56,
  "heightInches": 36,
  "distanceFromFloorInches": 0
}
```

### Backward Compatibility

If an old cabinet/product has no `lockMode`, it defaults to:

```ts
lockMode: "locked"
```

This preserves old behavior and prevents existing saved layouts from unexpectedly changing.

---

## Planner Input Structure

The API route converts raw room data into a planner-friendly input before calling OpenAI.

The final `plannerInput` shape is:

```ts
{
  project,
  meta,
  customerRequirements,
  walls,
  corners,
  existingObjects: {
    locked: [],
    required: [],
    suggested: []
  },
  designZones,
  catalog,
  outputRules
}
```

### `project`

Describes the overall design mode.

Example:

```json
{
  "unit": "inches",
  "designMode": "sales-home-measurement",
  "goal": "Create a realistic kitchen cabinet layout from measured walls and salesperson/customer requirements."
}
```

### `customerRequirements`

Contains designer feedback and customer/salesperson preferences.

Example:

```json
{
  "designerFeedback": "Keep the refrigerator near the right corner.",
  "layoutPreference": "l-shape",
  "stylePreference": null,
  "mustInclude": [],
  "mustAvoid": [],
  "notes": []
}
```

### `walls`

Contains AI-readable wall information, including wall IDs, labels, elevation dimensions, and fixed objects.

Only walls where `needCabinetPlacement` is true should receive new AI placements.

### `corners`

Describes wall corner relationships so AI can understand L-shapes, returns, and connected wall runs.

### `existingObjects`

Separates salesperson-placed objects by intent:

```json
{
  "locked": [],
  "required": [],
  "suggested": []
}
```

Only locked objects should be treated as fixed objects.

Required and suggested objects must not be converted into `elevationPlan.fixedObjects`.

### `designZones`

Optional design hints.

Example:

```json
{
  "wallsAllowedForCabinets": ["wall-1", "wall-2"],
  "plumbingWallIds": ["wall-1"],
  "rangeWallIds": [],
  "refrigeratorWallIds": [],
  "preferredSinkWallIds": ["wall-1"]
}
```

### `catalog`

The available cabinet and product catalog.

The AI must use catalog IDs exactly. It must not invent new cabinet IDs.

### `outputRules`

Tells AI how the final plan should be returned.

Example:

```json
{
  "coordinateSpace": "elevationPlan",
  "requireExplicitPlacements": true,
  "allowEmptySelectedWalls": true
}
```

---

## Preview Mode

Use `previewOnly: true` to inspect the exact AI request payload without calling OpenAI.

Example:

```json
{
  "room": {
    "walls": [],
    "windows": [],
    "doors": [],
    "cabinets": [],
    "catalog": [],
    "wallChains": [],
    "meta": {}
  },
  "designerFeedback": "Design a practical kitchen.",
  "previewOnly": true
}
```

Expected response:

```json
{
  "preview": {},
  "plannerInput": {}
}
```

Preview mode is the safest way to confirm:

- the route works
- the request body is valid
- `plannerInput` is shaped correctly
- locked objects are fixed
- required objects are not fixed
- suggested objects are not fixed
- the OpenAI request payload looks correct

---

## Running Local Tests

Create test payloads in:

```txt
tests/payloads/smart-kitchen/
```

Recommended files:

```txt
preview-old-format.json
preview-locked-refrigerator.json
preview-required-refrigerator.json
preview-suggested-drawer.json
run-required-refrigerator.json
```

### Test with curl

Preview old format:

```bash
curl -X POST http://127.0.0.1:3001/api/smart-kitchen \
  -H "Content-Type: application/json" \
  -d @tests/payloads/smart-kitchen/preview-old-format.json
```

Preview locked object:

```bash
curl -X POST http://127.0.0.1:3001/api/smart-kitchen \
  -H "Content-Type: application/json" \
  -d @tests/payloads/smart-kitchen/preview-locked-refrigerator.json
```

Preview required object:

```bash
curl -X POST http://127.0.0.1:3001/api/smart-kitchen \
  -H "Content-Type: application/json" \
  -d @tests/payloads/smart-kitchen/preview-required-refrigerator.json
```

Preview suggested object:

```bash
curl -X POST http://127.0.0.1:3001/api/smart-kitchen \
  -H "Content-Type: application/json" \
  -d @tests/payloads/smart-kitchen/preview-suggested-drawer.json
```

Run a real AI request:

```bash
curl -X POST http://127.0.0.1:3001/api/smart-kitchen \
  -H "Content-Type: application/json" \
  -d @tests/payloads/smart-kitchen/run-required-refrigerator.json
```

---

## Expected Test Results

### Old format object

Input object has no `lockMode`.

Expected:

```txt
existingObjects.locked contains the object
existingObjects.required is empty
existingObjects.suggested is empty
wall fixed objects include the object
```

### Locked object

Input object has:

```json
"lockMode": "locked"
```

Expected:

```txt
existingObjects.locked contains the object
wall fixed objects include the object
```

### Required object

Input object has:

```json
"lockMode": "required"
```

Expected:

```txt
existingObjects.required contains the object
existingObjects.locked is empty
wall fixed objects do not include the object
```

### Suggested object

Input object has:

```json
"lockMode": "suggested"
```

Expected:

```txt
existingObjects.suggested contains the object
existingObjects.locked is empty
wall fixed objects do not include the object
```

The most important rule:

```txt
Required and suggested objects must not be treated as fixedObjects.
```

---

## Expected AI Response

A successful non-preview response should include:

```json
{
  "layout": {},
  "plan": {}
}
```

A fallback response may include:

```json
{
  "layout": {},
  "plan": {},
  "usedFallback": true
}
```

Fallback is acceptable sometimes, but if it happens often, inspect:

- AI JSON validity
- normalized plan shape
- invalid catalog IDs
- invalid wall IDs
- placement collisions
- placements outside wall bounds
- unsupported layout assumptions

---

## Output Plan Shape

The AI is expected to return compact JSON with explicit placements.

Example:

```json
{
  "layoutType": "l-shape",
  "wallOrder": ["wall-1", "wall-2"],
  "notes": ["Practical L-shaped layout with cleanup and cooking zones."],
  "walls": [
    {
      "wallId": "wall-1",
      "wallLabel": "Wall 1",
      "needCabinetPlacement": true,
      "placements": [
        {
          "catalogId": "base-sink-cabinet",
          "leftInches": 36,
          "bottomInches": 0,
          "topOption": "sink",
          "notes": ["Main cleanup zone"]
        },
        {
          "catalogId": "product-range",
          "leftInches": 96,
          "bottomInches": 0,
          "topOption": null,
          "notes": []
        },
        {
          "catalogId": "product-wall-hood",
          "leftInches": 96,
          "bottomInches": 60,
          "topOption": null,
          "notes": []
        }
      ],
      "notes": ["Main working wall"]
    }
  ],
  "warnings": [
    {
      "type": "constraint-warning",
      "message": "Confirm plumbing location before final order."
    }
  ]
}
```

---

## Visual QA Checklist

After the AI generates a layout, inspect it in the editor.

Check:

```txt
Cabinets stay inside selected walls.
Locked objects stay fixed.
Required objects appear somewhere valid.
Suggested objects are not forced.
No cabinet overlaps a locked object.
No cabinet blocks a window.
No cabinet blocks a door.
No invalid catalog ID is used.
Base cabinets use bottomInches: 0.
Wall cabinets use reasonable bottomInches.
Hood aligns with range/cooktop where applicable.
Sink base placement is practical.
Corner cabinets are only used at real corners.
There are no strange tiny gaps unless unavoidable.
```

---

## Debugging

Enable debug logs:

```bash
DEBUG_SMART_KITCHEN=true
```

Useful logs:

```txt
plannerInput
raw AI plan
normalized plan
smart layout summary
```

If OpenAI returns an error like:

```txt
incorrect_api_key
```

then the route is working, but the environment does not have a valid OpenAI API key.

If `previewOnly` works but real AI generation fails, check:

- `OPENAI_API_KEY`
- model name
- OpenAI response status
- JSON parsing
- planner output shape
- layout generation fallback

If the AI returns bad JSON, inspect:

```txt
raw AI plan
```

If the plan normalizes but layout fails, inspect:

```txt
normalized plan
smart layout summary
```

---

## Project Checks

Run available checks before committing:

```bash
npx tsc --noEmit
npm run build
```

If linting is configured:

```bash
npm run lint
```

If tests are configured:

```bash
npm run test
```

Current known notes:

- TypeScript should pass.
- Build should pass.
- Some Next.js versions no longer support `next lint`; update the lint script if needed.
- If no test runner exists, consider adding Vitest later.

---

## Recommended Future Improvements

1. Add automated unit tests for `normalizeLockMode`.
2. Add automated tests for splitting objects into locked, required, and suggested.
3. Add validation tests to ensure only locked objects become fixed objects.
4. Add a second AI repair pass when the first AI plan cannot be rendered.
5. Add frontend controls for selecting object lock mode.
6. Add visual labels in the editor for locked, required, and suggested objects.
7. Add validation warnings in the final response.
8. Add customer-facing design summary notes.

---

## Summary

Use this feature by sending measured room JSON, catalog data, optional selected walls, optional designer feedback, and optional salesperson-placed objects.

The most important behavior is:

```txt
locked = fixed and cannot move
required = must appear but can move
suggested = hint only
```

The app should use AI for design suggestions, but code should still validate the final layout before rendering or ordering.
