"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { useMemo, useState } from "react";
import type {
  AiDesignProgressStep,
  AiKitchenDesignImage,
  AiKitchenDesignRequest,
} from "../ai-development/aiKitchenDevelopmentTypes";
import {
  aiKitchenApplianceCategoryOptions,
  aiKitchenCabinetCategoryOptions,
  aiKitchenCabinetTypeOptions,
  aiKitchenDevelopmentProgressLabels,
  aiKitchenFixtureCategoryOptions,
  aiKitchenSurfaceCategoryOptions,
  type AiKitchenSelectOption,
} from "../ai-development/aiKitchenDevelopmentOptions";
import {
  copyKitchenAiDevelopmentImagePromptItem,
  copyKitchenAiDevelopmentImagePromptPackage,
  copyKitchenAiDevelopmentPromptPackage,
  downloadKitchenAiDevelopmentImagePromptItem,
  downloadKitchenAiDevelopmentImagePromptPackage,
  downloadKitchenAiDevelopmentPrompt,
  downloadKitchenAiDevelopmentPromptPackage,
  downloadKitchenAiPreDesignedJson,
} from "../ai-development/kitchenAiDevelopmentManualFiles";
import { buildKitchenAiDevelopmentImagePromptPackage } from "../ai-development/kitchenAiDevelopmentImagePromptPackage";
import type {
  KitchenAiDevelopmentImagePromptItem,
  KitchenAiDevelopmentImagePromptPackage,
} from "../ai-development/kitchenAiDevelopmentImagePromptPackage";
import { buildKitchenAiDevelopmentPromptPackage } from "../ai-development/kitchenAiDevelopmentPromptPackage";
import type { KitchenAiDevelopmentPromptPackage } from "../ai-development/kitchenAiDevelopmentPromptPackage";
import { buildKitchenAiPreDesigned } from "../ai-development/kitchenAiPreDesignedExporter";
import { summarizeKitchenAiPreDesigned } from "../ai-development/kitchenAiPreDesignedSummary";
import { importKitchenAiDevelopmentPostDesignedJson } from "../ai-development/importKitchenAiDevelopmentPostDesignedJson";
import { summarizeKitchenAiPostDesigned } from "../ai-development/kitchenAiPostDesignedSummary";
import {
  summarizeKitchenAiDevelopmentScenePatchResult,
  summarizeKitchenAiPostDesignedValidationResult,
} from "../ai-development/kitchenAiDevelopmentScenePatchSummary";
import type { KitchenAiPostDesigned } from "../ai-development/kitchenAiPostDesignedTypes";
import type { KitchenAiPreDesigned } from "../ai-development/kitchenAiPreDesignedTypes";
import { runMockKitchenAiDevelopmentDesign } from "../ai-development/runMockKitchenAiDevelopmentDesign";
import { useKitchenAiDevelopmentStore } from "../ai-development/kitchenAiDevelopmentStore";
import { kitchenEditorDefinitions } from "../catalogs/registry/loadKitchenEditorRawDefinitions";
import { AiDesignProgressTimeline } from "./AiDesignProgressTimeline";
import { AiGeneratedDesignImages } from "./AiGeneratedDesignImages";
import { AiGeneratedImageLightbox } from "./AiGeneratedImageLightbox";
import { AiKitchenDesignForm } from "./AiKitchenDesignForm";
import { AiKitchenManualTestingPanel } from "./AiKitchenManualTestingPanel";

function createInitialKitchenDesignRequest(): AiKitchenDesignRequest {
  return {
    cabinets: [
      { id: "cabinet-type-default", inputKind: "type", type: "" },
      { id: "cabinet-category-default", inputKind: "category", category: "", quantity: 0 },
    ],
    surfaces: [{ id: "surface-default", category: "", quantity: 0 }],
    appliances: [{ id: "appliance-default", category: "", quantity: 0 }],
    fixtures: [{ id: "fixture-default", category: "", quantity: 0 }],
    prompt: "",
  };
}

export function KitchenAiDevelopmentPanel() {
  const designState = useKitchenAiDevelopmentStore((state) => state.designState);
  const setDesignState = useKitchenAiDevelopmentStore((state) => state.setDesignState);
  const [request, setRequest] = useState<AiKitchenDesignRequest>(() => createInitialKitchenDesignRequest());
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [activeProgressStepIndex, setActiveProgressStepIndex] = useState(0);
  const [submittedRequestSummary, setSubmittedRequestSummary] = useState<string | null>(null);
  const [latestPreDesigned, setLatestPreDesigned] = useState<KitchenAiPreDesigned | null>(null);
  const [preDesignedSummary, setPreDesignedSummary] = useState<string | null>(null);
  const [latestPromptPackage, setLatestPromptPackage] = useState<KitchenAiDevelopmentPromptPackage | null>(null);
  const [latestPostDesigned, setLatestPostDesigned] = useState<KitchenAiPostDesigned | null>(null);
  const [latestImagePromptPackage, setLatestImagePromptPackage] = useState<KitchenAiDevelopmentImagePromptPackage | null>(null);
  const [imagePlanSummary, setImagePlanSummary] = useState<string | null>(null);
  const [postDesignedSummary, setPostDesignedSummary] = useState<string | null>(null);
  const [postDesignedValidationSummary, setPostDesignedValidationSummary] = useState<string | null>(null);
  const [scenePatchSummary, setScenePatchSummary] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<AiKitchenDesignImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<AiKitchenDesignImage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualTestingMessage, setManualTestingMessage] = useState<string | null>(null);
  const [manualTestingErrors, setManualTestingErrors] = useState<readonly string[]>([]);
  const isDesigning = designState === "designing";
  const hasSubmittedRequest = submittedRequestSummary !== null;
  const shouldShowDesignForm = !hasSubmittedRequest;
  const shouldShowProgress =
    hasSubmittedRequest && (designState === "designing" || designState === "complete" || designState === "error");
  const progressSteps = useMemo(
    () => buildProgressSteps(activeProgressStepIndex, designState),
    [activeProgressStepIndex, designState],
  );

  async function handleSubmit() {
    if (isDesigning) {
      return;
    }

    const nextValidationMessage = validateKitchenDesignRequest(request);

    if (nextValidationMessage !== null) {
      setValidationMessage(nextValidationMessage);
      return;
    }

    let nextPreDesigned: KitchenAiPreDesigned;

    try {
      nextPreDesigned = buildKitchenAiPreDesigned({
        designScene: useDesignSceneStore.getState().designScene,
        assemblyDefinitions: kitchenEditorDefinitions,
        request,
      });
    } catch {
      setValidationMessage(null);
      setErrorMessage("Something went wrong while preparing your kitchen design input.");
      setGeneratedImages([]);
      setLatestPreDesigned(null);
      setPreDesignedSummary(null);
      setLatestPromptPackage(null);
      setLatestPostDesigned(null);
      setLatestImagePromptPackage(null);
      setImagePlanSummary(null);
      setPostDesignedSummary(null);
      setPostDesignedValidationSummary(null);
      setScenePatchSummary(null);
      setManualTestingMessage(null);
      setManualTestingErrors([]);
      setActiveProgressStepIndex(0);
      setDesignState("error");
      return;
    }

    const nextPromptPackage = buildKitchenAiDevelopmentPromptPackage(nextPreDesigned);

    setValidationMessage(null);
    setErrorMessage(null);
    setGeneratedImages([]);
    setSelectedImage(null);
    setSubmittedRequestSummary(buildRequestSummary(request));
    setLatestPreDesigned(nextPreDesigned);
    setPreDesignedSummary(summarizeKitchenAiPreDesigned(nextPreDesigned));
    setLatestPromptPackage(nextPromptPackage);
    setLatestPostDesigned(null);
    setLatestImagePromptPackage(null);
    setImagePlanSummary(null);
    setPostDesignedSummary(null);
    setPostDesignedValidationSummary(null);
    setScenePatchSummary(null);
    setManualTestingMessage("Manual AI testing files are ready.");
    setManualTestingErrors([]);
    setActiveProgressStepIndex(0);
    setDesignState("designing");

    try {
      const result = await runMockKitchenAiDevelopmentDesign({
        request,
        preDesigned: latestPreDesigned,
        promptPackage: nextPromptPackage,
        assemblyDefinitions: kitchenEditorDefinitions,
        onProgressStepChange: setActiveProgressStepIndex,
      });

      setLatestPostDesigned(result.postDesigned);
      setImagePlanSummary(result.imagePlanSummary);
      setLatestImagePromptPackage(buildKitchenAiDevelopmentImagePromptPackage({
        preDesigned: latestPreDesigned,
        postDesigned: result.postDesigned,
      }));
      setPostDesignedSummary(summarizeKitchenAiPostDesigned(result.postDesigned));
      setPostDesignedValidationSummary(summarizeKitchenAiPostDesignedValidationResult(result.validationResult));
      setScenePatchSummary(summarizeKitchenAiDevelopmentScenePatchResult(result.scenePatchResult));
      setGeneratedImages([...result.images]);
      setActiveProgressStepIndex(aiKitchenDevelopmentProgressLabels.length - 1);

      if (result.validationResult.postDesigned === null) {
        setErrorMessage("postDesigned.json failed validation. No editor scene changes were applied.");
        setDesignState("error");
        return;
      }

      setDesignState("complete");
    } catch {
      setErrorMessage("Something went wrong while designing your kitchen.");
      setDesignState("error");
    }
  }

  function handleStartAnotherDesign() {
    setRequest(createInitialKitchenDesignRequest());
    setValidationMessage(null);
    setActiveProgressStepIndex(0);
    setSubmittedRequestSummary(null);
    setLatestPreDesigned(null);
    setPreDesignedSummary(null);
    setLatestPromptPackage(null);
    setLatestPostDesigned(null);
    setLatestImagePromptPackage(null);
    setImagePlanSummary(null);
    setPostDesignedSummary(null);
    setPostDesignedValidationSummary(null);
    setScenePatchSummary(null);
    setManualTestingMessage(null);
    setManualTestingErrors([]);
    setGeneratedImages([]);
    setSelectedImage(null);
    setErrorMessage(null);
    setDesignState("idle");
  }

  async function handleCopyPromptPackage() {
    if (latestPromptPackage === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please click Send first to create preDesigned.json and the Development prompt package."]);
      return;
    }

    try {
      await copyKitchenAiDevelopmentPromptPackage(latestPromptPackage);
      setManualTestingMessage("Copied Prompt + preDesigned.json to clipboard.");
      setManualTestingErrors([]);
    } catch (error) {
      setManualTestingMessage(null);
      setManualTestingErrors([error instanceof Error ? error.message : "Could not copy the prompt package."]);
    }
  }

  function handleDownloadPreDesigned() {
    if (latestPreDesigned === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please click Send first to create preDesigned.json."]);
      return;
    }

    downloadKitchenAiPreDesignedJson(latestPreDesigned);
    setManualTestingMessage("Downloaded preDesigned.json.");
    setManualTestingErrors([]);
  }

  function handleDownloadDevelopmentPrompt() {
    if (latestPromptPackage === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please click Send first to create the Development prompt package."]);
      return;
    }

    downloadKitchenAiDevelopmentPrompt(latestPromptPackage);
    setManualTestingMessage("Downloaded Prompt Only.");
    setManualTestingErrors([]);
  }

  function handleDownloadPromptPackage() {
    if (latestPromptPackage === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please click Send first to create the Development prompt package."]);
      return;
    }

    downloadKitchenAiDevelopmentPromptPackage(latestPromptPackage);
    setManualTestingMessage("Downloaded Prompt + preDesigned.txt.");
    setManualTestingErrors([]);
  }

  async function handleCopyAllImageGenerationPrompts() {
    if (latestImagePromptPackage === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please create or upload postDesigned.json before copying image prompts."]);
      return;
    }

    try {
      await copyKitchenAiDevelopmentImagePromptPackage(latestImagePromptPackage);
      setManualTestingMessage("Copied all image prompts to clipboard. This single prompt asks the image AI to generate all required views as separate images.");
      setManualTestingErrors([]);
    } catch (error) {
      setManualTestingMessage(null);
      setManualTestingErrors([error instanceof Error ? error.message : "Could not copy the image prompts."]);
    }
  }

  function handleDownloadAllImageGenerationPrompts() {
    if (latestImagePromptPackage === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please create or upload postDesigned.json before downloading image prompts."]);
      return;
    }

    downloadKitchenAiDevelopmentImagePromptPackage(latestImagePromptPackage);
    setManualTestingMessage("Downloaded all image prompts. This file asks the image AI to generate all required views as separate images.");
    setManualTestingErrors([]);
  }

  async function handleCopyImageGenerationPromptItem(promptItem: KitchenAiDevelopmentImagePromptItem) {
    try {
      await copyKitchenAiDevelopmentImagePromptItem(promptItem);
      setManualTestingMessage(`Copied image prompt: ${promptItem.label}.`);
      setManualTestingErrors([]);
    } catch (error) {
      setManualTestingMessage(null);
      setManualTestingErrors([error instanceof Error ? error.message : "Could not copy the image prompt."]);
    }
  }

  function handleDownloadImageGenerationPromptItem(promptItem: KitchenAiDevelopmentImagePromptItem) {
    downloadKitchenAiDevelopmentImagePromptItem(promptItem);
    setManualTestingMessage(`Downloaded image prompt: ${promptItem.label}.`);
    setManualTestingErrors([]);
  }

  async function handleUploadPostDesignedJson(file: File) {
    try {
      const jsonText = await file.text();
      handleImportPostDesignedJsonText({
        jsonText,
        successMessage: "Uploaded postDesigned.json was validated and imported.",
      });
    } catch (error) {
      setManualTestingMessage(null);
      setManualTestingErrors([error instanceof Error ? error.message : "Could not read uploaded postDesigned.json."]);
      setErrorMessage("Something went wrong while importing postDesigned.json.");
      setDesignState("error");
    }
  }

  function handlePastePostDesignedJson(jsonText: string) {
    handleImportPostDesignedJsonText({
      jsonText,
      successMessage: "Pasted postDesigned.json was validated and imported.",
    });
  }

  function handleImportPostDesignedJsonText(args: { jsonText: string; successMessage: string }) {
    if (latestPreDesigned === null) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please click Send first to create preDesigned.json before importing postDesigned.json."]);
      return;
    }

    if (args.jsonText.trim().length === 0) {
      setManualTestingMessage(null);
      setManualTestingErrors(["Please paste the postDesigned.json text before importing."]);
      return;
    }

    try {
      const result = importKitchenAiDevelopmentPostDesignedJson({
        jsonText: args.jsonText,
        preDesigned: latestPreDesigned,
        assemblyDefinitions: kitchenEditorDefinitions,
      });

      setPostDesignedValidationSummary(summarizeKitchenAiPostDesignedValidationResult(result.validationResult));

      if (result.scenePatchResult !== null) {
        setScenePatchSummary(summarizeKitchenAiDevelopmentScenePatchResult(result.scenePatchResult));
      } else {
        setScenePatchSummary("Scene patch was not applied because postDesigned.json could not be parsed or validated.");
      }

      if (result.postDesigned === null) {
        setManualTestingMessage(null);
        setManualTestingErrors(result.validationResult.errors);
        setLatestImagePromptPackage(null);
        setImagePlanSummary(null);
        setErrorMessage("postDesigned.json failed validation. No editor scene changes were applied.");
        setDesignState("error");
        return;
      }

      setLatestPostDesigned(result.postDesigned);
      setImagePlanSummary(result.imagePlanSummary);
      setLatestImagePromptPackage(buildKitchenAiDevelopmentImagePromptPackage({
        preDesigned: latestPreDesigned,
        postDesigned: result.postDesigned,
      }));
      setPostDesignedSummary(summarizeKitchenAiPostDesigned(result.postDesigned));
      setGeneratedImages([...result.images]);
      setSelectedImage(null);
      setErrorMessage(null);
      setManualTestingMessage(args.successMessage);
      setManualTestingErrors([]);
      setActiveProgressStepIndex(aiKitchenDevelopmentProgressLabels.length - 1);
      setDesignState("complete");
    } catch (error) {
      setManualTestingMessage(null);
      setManualTestingErrors([error instanceof Error ? error.message : "Could not import postDesigned.json."]);
      setErrorMessage("Something went wrong while importing postDesigned.json.");
      setDesignState("error");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 p-3 text-sm">
      <div className="space-y-3">
        {submittedRequestSummary ? (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your request</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-700">{submittedRequestSummary}</p>
          </section>
        ) : null}

        {preDesignedSummary ? (
          <section className="rounded-xl border border-sky-100 bg-sky-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Development input</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-sky-900">{preDesignedSummary}</p>
          </section>
        ) : null}

        {latestPreDesigned !== null && latestPromptPackage !== null ? (
          <AiKitchenManualTestingPanel
            preDesigned={latestPreDesigned}
            promptPackage={latestPromptPackage}
            imagePromptPackage={latestImagePromptPackage}
            imagePlanSummary={imagePlanSummary}
            hasPostDesigned={latestPostDesigned !== null}
            disabled={isDesigning}
            message={manualTestingMessage}
            errors={manualTestingErrors}
            onCopyPromptPackage={handleCopyPromptPackage}
            onDownloadPreDesigned={handleDownloadPreDesigned}
            onDownloadDevelopmentPrompt={handleDownloadDevelopmentPrompt}
            onDownloadPromptPackage={handleDownloadPromptPackage}
            onUploadPostDesignedJson={(file) => {
              void handleUploadPostDesignedJson(file);
            }}
            onPastePostDesignedJson={handlePastePostDesignedJson}
            onCopyAllImageGenerationPrompts={() => {
              void handleCopyAllImageGenerationPrompts();
            }}
            onDownloadAllImageGenerationPrompts={handleDownloadAllImageGenerationPrompts}
            onCopyImageGenerationPromptItem={(promptItem) => {
              void handleCopyImageGenerationPromptItem(promptItem);
            }}
            onDownloadImageGenerationPromptItem={handleDownloadImageGenerationPromptItem}
          />
        ) : null}

        {shouldShowDesignForm ? (
          <AiKitchenDesignForm
            request={request}
            disabled={isDesigning}
            validationMessage={validationMessage}
            sendLabel={isDesigning ? "Designing..." : "Send"}
            onChangeRequest={(nextRequest) => {
              setRequest(nextRequest);
              setValidationMessage(null);
              if (designState === "idle") {
                setDesignState("editing-request");
              }
            }}
            onSubmit={handleSubmit}
          />
        ) : null}

        {shouldShowProgress ? <AiDesignProgressTimeline steps={progressSteps} /> : null}

        {errorMessage ? (
          <section className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}

        {postDesignedSummary ? (
          <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Development output</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-emerald-900">{postDesignedSummary}</p>
          </section>
        ) : null}

        {postDesignedValidationSummary ? (
          <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Validation</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-indigo-900">{postDesignedValidationSummary}</p>
          </section>
        ) : null}

        {scenePatchSummary ? (
          <section className="rounded-xl border border-violet-100 bg-violet-50 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Scene patch</p>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-violet-900">{scenePatchSummary}</p>
          </section>
        ) : null}

        {designState === "complete" ? (
          <AiGeneratedDesignImages images={generatedImages} onSelectImage={setSelectedImage} />
        ) : null}

        {hasSubmittedRequest && designState !== "designing" ? (
          <button
            type="button"
            onClick={handleStartAnotherDesign}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            Start another design
          </button>
        ) : null}
      </div>

      <AiGeneratedImageLightbox
        image={selectedImage}
        images={generatedImages}
        onSelectImage={setSelectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}

function buildProgressSteps(activeStepIndex: number, designState: string): AiDesignProgressStep[] {
  return aiKitchenDevelopmentProgressLabels.map((label, index) => {
    if (designState === "error" && index === activeStepIndex) {
      return { id: label, label, status: "error" };
    }

    if (designState === "complete") {
      return { id: label, label, status: "complete" };
    }

    if (index < activeStepIndex) {
      return { id: label, label, status: "complete" };
    }

    if (index === activeStepIndex) {
      return { id: label, label, status: "active" };
    }

    return { id: label, label, status: "pending" };
  });
}

function validateKitchenDesignRequest(request: AiKitchenDesignRequest): string | null {
  if (!hasAnyUserInput(request)) {
    return "Please add at least one requirement or describe the kitchen you want.";
  }

  if (hasQuantityWithoutSelection(request)) {
    return "Please select an option for every row with a quantity.";
  }

  return null;
}

function hasAnyUserInput(request: AiKitchenDesignRequest): boolean {
  return (
    request.prompt.trim().length > 0 ||
    request.cabinets.some((requirement) => requirement.inputKind === "category" && requirement.quantity > 0) ||
    request.surfaces.some((requirement) => requirement.quantity > 0) ||
    request.appliances.some((requirement) => requirement.quantity > 0) ||
    request.fixtures.some((requirement) => requirement.quantity > 0)
  );
}

function hasQuantityWithoutSelection(request: AiKitchenDesignRequest): boolean {
  const hasInvalidCabinetRequirement = request.cabinets.some((requirement) => {
    if (requirement.inputKind === "type" || requirement.quantity <= 0) {
      return false;
    }

    return (requirement.category ?? "").trim().length === 0;
  });

  return (
    hasInvalidCabinetRequirement ||
    request.surfaces.some((requirement) => requirement.quantity > 0 && (requirement.category ?? "").trim().length === 0) ||
    request.appliances.some((requirement) => requirement.quantity > 0 && (requirement.category ?? "").trim().length === 0) ||
    request.fixtures.some((requirement) => requirement.quantity > 0 && (requirement.category ?? "").trim().length === 0)
  );
}

function buildRequestSummary(request: AiKitchenDesignRequest): string {
  const summaryLines = [
    ...buildCabinetSummaryLines(request),
    ...request.surfaces
      .filter((requirement) => requirement.quantity > 0)
      .map((requirement) => `Surfaces: ${getOptionLabel(aiKitchenSurfaceCategoryOptions, requirement.category)} x ${requirement.quantity}`),
    ...request.appliances
      .filter((requirement) => requirement.quantity > 0)
      .map((requirement) => `Appliances: ${getOptionLabel(aiKitchenApplianceCategoryOptions, requirement.category)} x ${requirement.quantity}`),
    ...request.fixtures
      .filter((requirement) => requirement.quantity > 0)
      .map((requirement) => `Fixtures: ${getOptionLabel(aiKitchenFixtureCategoryOptions, requirement.category)} x ${requirement.quantity}`),
  ];

  if (request.prompt.trim().length > 0) {
    summaryLines.push(`Prompt: ${request.prompt.trim()}`);
  }

  return summaryLines.join("\n");
}

function buildCabinetSummaryLines(request: AiKitchenDesignRequest): string[] {
  const summaryLines: string[] = [];
  let currentCabinetType = "";

  for (const requirement of request.cabinets) {
    if (requirement.inputKind === "type") {
      currentCabinetType = getOptionLabel(aiKitchenCabinetTypeOptions, requirement.type);
      continue;
    }

    if (requirement.quantity <= 0) {
      continue;
    }

    const cabinetCategory = getOptionLabel(aiKitchenCabinetCategoryOptions, requirement.category);

    summaryLines.push(
      currentCabinetType && currentCabinetType !== "Unknown"
        ? `Cabinets: ${currentCabinetType} - ${cabinetCategory} x ${requirement.quantity}`
        : `Cabinets: ${cabinetCategory} x ${requirement.quantity}`,
    );
  }

  return summaryLines;
}

function getOptionLabel(options: readonly AiKitchenSelectOption[], value: string | undefined): string {
  return options.find((option) => option.value === value)?.label ?? value ?? "Unknown";
}
