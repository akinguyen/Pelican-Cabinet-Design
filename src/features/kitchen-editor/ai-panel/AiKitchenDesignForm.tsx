"use client";

import type { AiKitchenDesignRequest } from "../ai-development/aiKitchenDevelopmentTypes";
import {
  aiKitchenApplianceCategoryOptions,
  aiKitchenCabinetCategoryOptions,
  aiKitchenCabinetTypeOptions,
  aiKitchenFixtureCategoryOptions,
  aiKitchenSurfaceCategoryOptions,
} from "../ai-development/aiKitchenDevelopmentOptions";
import { AiKitchenRequirementRow } from "./AiKitchenRequirementRow";
import { AiKitchenRequirementSection } from "./AiKitchenRequirementSection";

type AiKitchenDesignFormProps = {
  request: AiKitchenDesignRequest;
  disabled: boolean;
  validationMessage: string | null;
  sendLabel: string;
  onChangeRequest: (request: AiKitchenDesignRequest) => void;
  onSubmit: () => void;
};

export function AiKitchenDesignForm({
  request,
  disabled,
  validationMessage,
  sendLabel,
  onChangeRequest,
  onSubmit,
}: AiKitchenDesignFormProps) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <section className="rounded-xl border border-sky-100 bg-sky-50 p-3 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">Hello! I can help you design your kitchen.</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Fill in the items you want, then tell me your preferred style or layout.
        </p>
      </section>

      <AiKitchenRequirementSection
        title="Cabinets"
        description="Choose cabinet types or specific cabinet categories."
        disabled={disabled}
        onAdd={() => {
          const cabinetGroupId = createRequirementId("cabinet");

          onChangeRequest({
            ...request,
            cabinets: [
              ...request.cabinets,
              { id: `${cabinetGroupId}-type`, inputKind: "type", type: "" },
              { id: `${cabinetGroupId}-category`, inputKind: "category", category: "", quantity: 0 },
            ],
          });
        }}
      >
        {request.cabinets.map((cabinetRequirement, index) => {
          const isTypeRow = cabinetRequirement.inputKind === "type";

          return (
            <AiKitchenRequirementRow
              key={cabinetRequirement.id}
              label={isTypeRow ? "Type" : "Category"}
              placeholder={isTypeRow ? "Select type" : "Select category"}
              value={isTypeRow ? cabinetRequirement.type ?? "" : cabinetRequirement.category ?? ""}
              quantity={isTypeRow ? undefined : cabinetRequirement.quantity}
              options={isTypeRow ? aiKitchenCabinetTypeOptions : aiKitchenCabinetCategoryOptions}
              disabled={disabled}
              canRemove={!isTypeRow && request.cabinets.length > 2 && index > 1}
              showQuantity={!isTypeRow}
              onChangeValue={(value) => {
                onChangeRequest({
                  ...request,
                  cabinets: request.cabinets.map((matchingRequirement) => {
                    if (matchingRequirement.id !== cabinetRequirement.id) {
                      return matchingRequirement;
                    }

                    return isTypeRow
                      ? { ...matchingRequirement, type: value }
                      : { ...matchingRequirement, category: value };
                  }),
                });
              }}
              onChangeQuantity={(quantity) => {
                if (isTypeRow) {
                  return;
                }

                onChangeRequest({
                  ...request,
                  cabinets: request.cabinets.map((matchingRequirement) =>
                    matchingRequirement.id === cabinetRequirement.id && matchingRequirement.inputKind === "category"
                      ? { ...matchingRequirement, quantity }
                      : matchingRequirement,
                  ),
                });
              }}
              onRemove={() => {
                const pairedCabinetTypeId = findPairedCabinetTypeId(request, index);

                onChangeRequest({
                  ...request,
                  cabinets: request.cabinets.filter(
                    (matchingRequirement) =>
                      matchingRequirement.id !== cabinetRequirement.id && matchingRequirement.id !== pairedCabinetTypeId,
                  ),
                });
              }}
            />
          );
        })}
      </AiKitchenRequirementSection>

      <AiKitchenRequirementSection
        title="Surfaces"
        disabled={disabled}
        onAdd={() => {
          onChangeRequest({
            ...request,
            surfaces: [...request.surfaces, { id: createRequirementId("surface"), category: "", quantity: 0 }],
          });
        }}
      >
        {request.surfaces.map((surfaceRequirement) => (
          <AiKitchenRequirementRow
            key={surfaceRequirement.id}
            label="Category"
            placeholder="Select category"
            value={surfaceRequirement.category ?? ""}
            quantity={surfaceRequirement.quantity}
            options={aiKitchenSurfaceCategoryOptions}
            disabled={disabled}
            canRemove={request.surfaces.length > 1}
            onChangeValue={(category) => {
              onChangeRequest({
                ...request,
                surfaces: request.surfaces.map((matchingRequirement) =>
                  matchingRequirement.id === surfaceRequirement.id ? { ...matchingRequirement, category } : matchingRequirement,
                ),
              });
            }}
            onChangeQuantity={(quantity) => {
              onChangeRequest({
                ...request,
                surfaces: request.surfaces.map((matchingRequirement) =>
                  matchingRequirement.id === surfaceRequirement.id ? { ...matchingRequirement, quantity } : matchingRequirement,
                ),
              });
            }}
            onRemove={() => {
              onChangeRequest({
                ...request,
                surfaces: request.surfaces.filter((matchingRequirement) => matchingRequirement.id !== surfaceRequirement.id),
              });
            }}
          />
        ))}
      </AiKitchenRequirementSection>

      <AiKitchenRequirementSection
        title="Appliances"
        disabled={disabled}
        onAdd={() => {
          onChangeRequest({
            ...request,
            appliances: [...request.appliances, { id: createRequirementId("appliance"), category: "", quantity: 0 }],
          });
        }}
      >
        {request.appliances.map((applianceRequirement) => (
          <AiKitchenRequirementRow
            key={applianceRequirement.id}
            label="Category"
            placeholder="Select category"
            value={applianceRequirement.category ?? ""}
            quantity={applianceRequirement.quantity}
            options={aiKitchenApplianceCategoryOptions}
            disabled={disabled}
            canRemove={request.appliances.length > 1}
            onChangeValue={(category) => {
              onChangeRequest({
                ...request,
                appliances: request.appliances.map((matchingRequirement) =>
                  matchingRequirement.id === applianceRequirement.id ? { ...matchingRequirement, category } : matchingRequirement,
                ),
              });
            }}
            onChangeQuantity={(quantity) => {
              onChangeRequest({
                ...request,
                appliances: request.appliances.map((matchingRequirement) =>
                  matchingRequirement.id === applianceRequirement.id ? { ...matchingRequirement, quantity } : matchingRequirement,
                ),
              });
            }}
            onRemove={() => {
              onChangeRequest({
                ...request,
                appliances: request.appliances.filter((matchingRequirement) => matchingRequirement.id !== applianceRequirement.id),
              });
            }}
          />
        ))}
      </AiKitchenRequirementSection>

      <AiKitchenRequirementSection
        title="Fixtures"
        disabled={disabled}
        onAdd={() => {
          onChangeRequest({
            ...request,
            fixtures: [...request.fixtures, { id: createRequirementId("fixture"), category: "", quantity: 0 }],
          });
        }}
      >
        {request.fixtures.map((fixtureRequirement) => (
          <AiKitchenRequirementRow
            key={fixtureRequirement.id}
            label="Category"
            placeholder="Select category"
            value={fixtureRequirement.category ?? ""}
            quantity={fixtureRequirement.quantity}
            options={aiKitchenFixtureCategoryOptions}
            disabled={disabled}
            canRemove={request.fixtures.length > 1}
            onChangeValue={(category) => {
              onChangeRequest({
                ...request,
                fixtures: request.fixtures.map((matchingRequirement) =>
                  matchingRequirement.id === fixtureRequirement.id ? { ...matchingRequirement, category } : matchingRequirement,
                ),
              });
            }}
            onChangeQuantity={(quantity) => {
              onChangeRequest({
                ...request,
                fixtures: request.fixtures.map((matchingRequirement) =>
                  matchingRequirement.id === fixtureRequirement.id ? { ...matchingRequirement, quantity } : matchingRequirement,
                ),
              });
            }}
            onRemove={() => {
              onChangeRequest({
                ...request,
                fixtures: request.fixtures.filter((matchingRequirement) => matchingRequirement.id !== fixtureRequirement.id),
              });
            }}
          />
        ))}
      </AiKitchenRequirementSection>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="text-sm font-semibold text-slate-950">
          Message
          <textarea
            className="mt-2 min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            placeholder="Tell me your preferred style, layout, or extra requirements."
            value={request.prompt}
            disabled={disabled}
            onChange={(event) => {
              onChangeRequest({ ...request, prompt: event.target.value });
            }}
          />
        </label>

        {validationMessage ? (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{validationMessage}</p>
        ) : null}

        <button
          type="submit"
          className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={disabled}
        >
          {sendLabel}
        </button>
      </section>
    </form>
  );
}

function findPairedCabinetTypeId(request: AiKitchenDesignRequest, categoryRowIndex: number): string | null {
  for (let index = categoryRowIndex - 1; index >= 0; index -= 1) {
    const requirement = request.cabinets[index];

    if (!requirement) {
      return null;
    }

    if (requirement.inputKind === "category") {
      return null;
    }

    if (requirement.inputKind === "type") {
      return requirement.id;
    }
  }

  return null;
}

function createRequirementId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
