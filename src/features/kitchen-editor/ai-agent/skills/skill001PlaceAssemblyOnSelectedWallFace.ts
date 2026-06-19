export const skill001PlaceAssemblyOnSelectedWallFace = {
  id: "skill-001-place-assembly-on-selected-wall-face",
  name: "Place assembly on selected wall face",
  status: "active",
  description:
    "Places one catalog assembly against the selected wall face using wall-local u coordinates. This skill creates the single-object placement action that later skills can position more precisely.",
  supportedActions: ["placeAssemblyOnSelectedWallFace"],
  exampleUserMessages: [
    "Place a 30 inch base cabinet on this wall.",
    "Add a 36 inch cabinet here.",
    "Put a 24 inch base cabinet on the selected wall.",
  ],
} as const;
