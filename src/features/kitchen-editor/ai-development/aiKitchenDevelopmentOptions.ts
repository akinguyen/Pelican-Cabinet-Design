export type AiKitchenSelectOption = {
  value: string;
  label: string;
};

export const aiKitchenCabinetTypeOptions: readonly AiKitchenSelectOption[] = [
  { value: "base-cabinets", label: "Base cabinets" },
  { value: "wall-cabinets", label: "Wall cabinets" },
  { value: "pantry-cabinets", label: "Pantry cabinets" },
  { value: "built-in-cabinets", label: "Built-in cabinets" },
] as const;

export const aiKitchenCabinetCategoryOptions: readonly AiKitchenSelectOption[] = [
  { value: "standard-base-cabinets", label: "Standard base cabinets" },
  { value: "drawer-base-cabinets", label: "Drawer base cabinets" },
  { value: "sink-base-cabinets", label: "Sink base cabinets" },
  { value: "corner-base-cabinets", label: "Corner base cabinets" },
  { value: "pullout-rack-base-cabinets", label: "Pullout rack base cabinets" },
  { value: "standard-wall-cabinets", label: "Standard wall cabinets" },
  { value: "blind-wall-cabinets", label: "Blind wall cabinets" },
  { value: "base-pantry-cabinets", label: "Base pantry cabinets" },
  { value: "wall-pantry-cabinets", label: "Wall pantry cabinets" },
  { value: "oven-cabinets", label: "Oven cabinets" },
  { value: "microwave-cabinets", label: "Microwave cabinets" },
] as const;

export const aiKitchenSurfaceCategoryOptions: readonly AiKitchenSelectOption[] = [
  { value: "countertops", label: "Countertops" },
] as const;

export const aiKitchenApplianceCategoryOptions: readonly AiKitchenSelectOption[] = [
  { value: "cooking", label: "Cooking" },
  { value: "cooktops", label: "Cooktops" },
  { value: "dishwashers", label: "Dishwashers" },
  { value: "refrigeration", label: "Refrigeration" },
  { value: "ventilation", label: "Ventilation" },
] as const;

export const aiKitchenFixtureCategoryOptions: readonly AiKitchenSelectOption[] = [
  { value: "sinks", label: "Sinks" },
  { value: "faucets", label: "Faucets" },
] as const;

export const aiKitchenDevelopmentProgressLabels = [
  "Start design",
  "Analyzing kitchen requirements",
  "Thinking about cabinet arrangement",
  "Cabinet arrangement finished",
  "Planning surface placement",
  "Surface arrangement finished",
  "Arranging appliances",
  "Appliance arrangement finished",
  "Placing fixtures",
  "Fixture placement finished",
  "Checking spacing and layout balance",
  "Preparing kitchen design images",
  "Finished design",
] as const;
