import type { AiKitchenDesignRequest } from "./aiKitchenDevelopmentTypes";
import {
  aiKitchenApplianceCategoryOptions,
  aiKitchenCabinetCategoryOptions,
  aiKitchenCabinetTypeOptions,
  aiKitchenFixtureCategoryOptions,
  aiKitchenSurfaceCategoryOptions,
  type AiKitchenSelectOption,
} from "./aiKitchenDevelopmentOptions";
import type {
  KitchenAiPreDesignedCabinetRequirement,
  KitchenAiPreDesignedRequirement,
  KitchenAiPreDesignedUserRequirements,
} from "./kitchenAiPreDesignedTypes";

export function normalizeKitchenAiDevelopmentRequest(
  request: AiKitchenDesignRequest,
): KitchenAiPreDesignedUserRequirements {
  return {
    cabinets: normalizeCabinetRequirements(request),
    surfaces: normalizeCategoryRequirements(request.surfaces, aiKitchenSurfaceCategoryOptions),
    appliances: normalizeCategoryRequirements(request.appliances, aiKitchenApplianceCategoryOptions),
    fixtures: normalizeCategoryRequirements(request.fixtures, aiKitchenFixtureCategoryOptions),
    prompt: request.prompt.trim(),
  };
}

function normalizeCabinetRequirements(
  request: AiKitchenDesignRequest,
): readonly KitchenAiPreDesignedCabinetRequirement[] {
  const normalizedRequirements: KitchenAiPreDesignedCabinetRequirement[] = [];
  let activeType = "";

  request.cabinets.forEach((requirement) => {
    if (requirement.inputKind === "type") {
      activeType = (requirement.type ?? "").trim();
      return;
    }

    const category = (requirement.category ?? "").trim();
    const quantity = normalizeQuantity(requirement.quantity);

    if (category.length === 0 || quantity <= 0) {
      return;
    }

    normalizedRequirements.push({
      id: requirement.id,
      type: activeType.length > 0 ? activeType : undefined,
      typeLabel: activeType.length > 0 ? getOptionLabel(aiKitchenCabinetTypeOptions, activeType) : undefined,
      category,
      categoryLabel: getOptionLabel(aiKitchenCabinetCategoryOptions, category),
      quantity,
    });
  });

  return normalizedRequirements;
}

function normalizeCategoryRequirements(
  requirements: AiKitchenDesignRequest["surfaces"],
  options: readonly AiKitchenSelectOption[],
): readonly KitchenAiPreDesignedRequirement[] {
  return requirements.flatMap((requirement) => {
    const category = (requirement.category ?? "").trim();
    const quantity = normalizeQuantity(requirement.quantity);

    if (category.length === 0 || quantity <= 0) {
      return [];
    }

    return [
      {
        id: requirement.id,
        category,
        categoryLabel: getOptionLabel(options, category),
        quantity,
      },
    ];
  });
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(quantity));
}

function getOptionLabel(options: readonly AiKitchenSelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
