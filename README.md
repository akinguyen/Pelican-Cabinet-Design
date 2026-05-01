# Pelican Cabinet Editor

A first-pass Next.js + Tailwind UI for a Pelican kitchen cabinet editor.

## Included UI

- Full-screen editor layout
- Top action bar with Undo, Redo, Export, Render Studio, Save, Exit Editor
- Floorplan / Top-down / Perspective view switcher
- Canvas grid workspace on the left
- Walls toolbar selected on the right
- Context panel with the floor plan object menu
- Wall line option shown as `Draw Wall (W)`

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Main files

```txt
app/page.tsx
app/layout.tsx
app/globals.css
components/editor/CabinetEditor.tsx
lib/utils.ts
tailwind.config.ts
```

The first interactive feature to build next should be state-driven toolbar switching, then click-to-draw wall behavior on the grid.
