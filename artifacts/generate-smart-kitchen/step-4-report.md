# Step 4 Report

Step: Switch the visible attached file from file 1 to file 2 after generation.

Files changed:
- `src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenSessionRestore.test.tsx`

Implementation summary:
- Added `activeAttachment` as the screen-level source of truth for the visible attachment card and download target.
- The initial workspace load still shows file 1 from the editor export.
- After `Generate Images` succeeds, `activeAttachment` switches to a generated attachment object that carries:
  - `room`
  - `generatedLayout`
  - `generatedRoomFileName`
  - `instructions`
  - `generatedAtIso`
- The attachment card now updates its label/size to match the generated design.
- `Download Attached File` now uses a JSON payload built from the current active attachment:
  - file 1 payload includes the original editor export room
  - file 2 payload includes `room` and `generatedLayout`
- The restored History/session path reconstructs the generated attachment from the saved `generatedRoom`, `generatedLayout`, and `generatedRoomFileName` fields.
- The backend request remains compatible because `generateSmartKitchenImages(...)` still receives an `AiRoomInput` room object.

Tests run:
- Targeted TypeScript compile for the smart kitchen screen and session tests.
- Targeted TypeScript compile for the editor restore path files from Step 3.

Limitations, warnings, TODOs:
- The workspace session does not persist a separate attachment blob; it reconstructs file 2 from the saved generated room/layout fields.
- The sandbox does not include local Vitest binaries, so the new tests were added but not executed here.
- The current file name for the generated attachment still comes from the backend/file naming path, with a fallback to `smart-kitchen-generated-design.json`.
