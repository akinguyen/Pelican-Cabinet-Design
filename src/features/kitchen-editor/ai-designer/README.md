# AI Kitchen Designer Instruction Prompts V3

This package is a rewritten and tightened instruction prompt set for an AI that receives Kitchen Editor input packages and returns an importable `kitchen-editor-scene/v3` JSON layout.

Primary algorithm:

```txt
fixed input -> design intent -> usable spans -> base/tall runs -> atomic blind corners -> wall runs -> panels -> countertops -> validation -> final JSON
```

Use the markdown files in `standard-instructions/` as the standard instruction package.

Important changes in this update:

- The AI does not invent doors, windows, openings, or unrequested appliances.
- User-placed input objects are fixed anchors by default.
- Appliances are used only when fixed in input or requested by the user.
- Base/tall runs are solved before wall runs.
- Every usable span must be intentionally filled; random gaps are invalid.
- Blind corners are solved as complete atomic candidates: host blind cabinet + visible turning filler + turning-wall run-end cabinet + access validation + footprint validation.
- Passing box collision is not enough; blind-cabinet door/front access must remain usable.
- Missing turning blind filler is a hard failure when a blind-corner gap exists.
- Fillers and panels are strictly separated.
- Panels are added only to exposed visible sides after runs are valid.
- Countertops are generated only from valid continuous base runs and must not overlap at inside corners.
- Any geometry fix invalidates affected previous checks; the AI must rerun full validation before output.

- User-authored DesignReservationZone build volumes are preserved and used as guidance for islands, peninsulas, and tall pantry areas.
