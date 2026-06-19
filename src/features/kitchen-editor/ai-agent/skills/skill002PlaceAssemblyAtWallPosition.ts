export const skill002PlaceAssemblyAtWallPosition = {
  id: "skill-002-place-assembly-at-wall-position",
  name: "Place assembly elevation-left start, center, elevation-right end, or offset",
  status: "active",
  description:
    "Places one catalog assembly on the selected wall face at the elevation-left start side, center, elevation-right end side, or a requested wall-local offset. Left and right are treated as aliases for start and end.",
  supportedActions: ["placeAssemblyOnSelectedWallFace"],
  exampleUserMessages: [
    "Place a 30 inch base cabinet at the start of this wall.",
    "Place a 36 inch base cabinet centered on this wall.",
    "Place a 24 inch cabinet at the end of this wall.",
    "Place a 30 inch base cabinet 12 inches from the start.",
    "Place a 30 inch base cabinet 12 inches from the end.",
  ],
} as const;
