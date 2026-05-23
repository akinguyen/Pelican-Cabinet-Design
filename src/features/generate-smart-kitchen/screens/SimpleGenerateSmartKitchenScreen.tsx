'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  Heart,
  House,
  LogOut,
  Settings2,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { KitchenImageCard } from '../components/shared/KitchenImageCard';
import { SectionCard } from '../components/shared/SectionCard';
import type { AiRoomInput } from '../../../../lib/ai/types';
import {
  loadSmartKitchenWorkspaceDraft,
  type SmartKitchenWorkspaceDraft,
  SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID,
} from '../utils/workspaceDraftStorage';
import {
  generateSmartKitchenImages,
  type GeneratedSmartKitchenImage,
} from '../utils/generateSmartKitchenImages';

export interface SimpleGenerateSmartKitchenScreenProps {
  readonly projectId: string;
  readonly initialDraft?: SmartKitchenWorkspaceDraft | null;
}

interface WorkspaceNavItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly isActive?: boolean;
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

function downloadJsonFile(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function formatInstructionCharacterCounter(value: string): string {
  return `${Math.min(value.length, 1000)} / 1000`;
}

function WorkspaceNavLink({ label, icon: Icon, isActive = false }: WorkspaceNavItem) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      className={joinClassNames(
        'group flex w-full items-center gap-3 rounded-2xl border-l-4 px-4 py-3 text-left transition',
        isActive
          ? 'border-l-[#38d6c8] bg-white/10 text-white shadow-[0_12px_40px_rgba(0,0,0,0.15)]'
          : 'border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white',
      )}
    >
      <span
        className={joinClassNames(
          'flex h-9 w-9 items-center justify-center rounded-xl transition',
          isActive ? 'bg-[#0f3d43] text-[#7ff0e6]' : 'bg-white/5 text-slate-300 group-hover:bg-white/10',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function GeneratedImageSkeletonCard() {
  return (
    <figure className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
        <FileText className="h-5 w-5" />
      </div>
      <div className="mt-5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#13bbb3] via-[#8ee8df] to-transparent" />
      </div>
    </figure>
  );
}

interface GeneratedImageConceptGroup {
  readonly key: string;
  readonly label: string;
  readonly images: readonly GeneratedSmartKitchenImage[];
  readonly startIndex: number;
}

const SMART_KITCHEN_CONCEPT_COUNT = 5;
const SMART_KITCHEN_IMAGES_PER_CONCEPT = 3;

export function buildGeneratedImageConceptGroups(
  images: readonly GeneratedSmartKitchenImage[],
): readonly GeneratedImageConceptGroup[] {
  if (images.length === 0) {
    return [];
  }

  type ImageWithConceptMetadata = GeneratedSmartKitchenImage &
    Partial<{
      conceptId: string;
      conceptLabel: string;
      conceptIndex: number;
    }>;

  const imagesWithMetadata = images as readonly ImageWithConceptMetadata[];
  const conceptGroups = new Map<string, GeneratedImageConceptGroup>();
  let sawConceptMetadata = false;

  for (const [index, image] of imagesWithMetadata.entries()) {
    const conceptKey =
      image.conceptId ??
      (typeof image.conceptIndex === 'number' ? `concept-${image.conceptIndex}` : undefined);

    if (!conceptKey) {
      continue;
    }

    sawConceptMetadata = true;
    const conceptLabel =
      image.conceptLabel ??
      (typeof image.conceptIndex === 'number'
        ? `Concept ${image.conceptIndex + 1}`
        : `Concept ${conceptGroups.size + 1}`);

    const existingGroup = conceptGroups.get(conceptKey);
    if (existingGroup) {
      conceptGroups.set(conceptKey, {
        ...existingGroup,
        images: [...existingGroup.images, image],
      });
      continue;
    }

    conceptGroups.set(conceptKey, {
      key: conceptKey,
      label: conceptLabel,
      images: [image],
      startIndex: index,
    });
  }

  if (sawConceptMetadata && conceptGroups.size > 0) {
    return Array.from(conceptGroups.values()).sort((left, right) => left.startIndex - right.startIndex);
  }

  const groupedImages: GeneratedImageConceptGroup[] = [];

  for (let conceptIndex = 0; conceptIndex < SMART_KITCHEN_CONCEPT_COUNT; conceptIndex += 1) {
    const startIndex = conceptIndex * SMART_KITCHEN_IMAGES_PER_CONCEPT;
    const conceptImages = images.slice(startIndex, startIndex + SMART_KITCHEN_IMAGES_PER_CONCEPT);

    if (conceptImages.length === 0) {
      continue;
    }

    groupedImages.push({
      key: `concept-${conceptIndex + 1}`,
      label: `Concept ${conceptIndex + 1}`,
      images: conceptImages,
      startIndex,
    });
  }

  return groupedImages;
}

function GeneratingImagesProgressPanel({ progress }: { readonly progress: number }) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <section className="mt-6 rounded-[24px] border border-[#dfeeea] bg-[#f8fcfb] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ccefe9] bg-[#e9fbf8] text-[#0e8e87] shadow-[0_10px_24px_rgba(14,142,135,0.14)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Generating Images
            </h3>
            <span className="text-xs font-semibold text-slate-500">{safeProgress}%</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Creating five kitchen concepts with three separate images each from the attached project file...
          </p>
          <div
            className="mt-4 h-3 w-full overflow-hidden rounded-full border border-[#cfd9e8] bg-[#d9e1ef] shadow-inner"
            role="progressbar"
            aria-label="Image generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
          >
            <div
              className="h-full rounded-full bg-[#16b8b0] shadow-[0_0_18px_rgba(22,184,176,0.36)] transition-[width] duration-500 ease-out"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <Sparkles className="h-4 w-4 text-[#0e8e87]" />
        <span>This may take a few moments. You will see five concepts with three separate images each when ready.</span>
      </p>
    </section>
  );
}

function GeneratedConceptImageRow({
  group,
  generatedImages,
  onImageClick,
}: {
  readonly group: GeneratedImageConceptGroup;
  readonly generatedImages: readonly GeneratedSmartKitchenImage[];
  readonly onImageClick: (imageIndex: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">{group.label}</h4>
          <p className="mt-1 text-xs text-slate-500">
            {group.images.length > 1
              ? `${group.images.length} separate images for this concept.`
              : 'Generated kitchen concept image.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#eefaf8] px-3 py-1 text-xs font-semibold text-[#0e8e87]">
            {group.images.length} image{group.images.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="flex flex-row gap-4 overflow-x-auto p-4 pb-5">
        {group.images.map((image, imageIndex) => {
          const generatedImageIndex = generatedImages.findIndex((generatedImage) => generatedImage.id === image.id);
          const safeImageIndex = generatedImageIndex >= 0 ? generatedImageIndex : group.startIndex + imageIndex;

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageClick(safeImageIndex)}
              className="group/image min-w-[260px] flex-1 overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)] focus-visible:ring-4 focus-visible:ring-[#b9f1ec]"
              aria-label={`Open ${group.label} image ${imageIndex + 1}`}
            >
              <KitchenImageCard
                imageUrl={image.imageUrl}
                alt={`${group.label} image ${imageIndex + 1}`}
                title={image.imageLabel ?? `Image ${imageIndex + 1}`}
                subtitle={image.conceptLabel ?? group.label}
                className="border-none shadow-none"
                imageClassName="h-auto w-full transition duration-300 group-hover/image:scale-[1.02]"
                imgProps={{
                  loading: 'lazy',
                }}
              />
            </button>
          );
        })}
      </div>
    </article>
  );
}


export function SimpleGenerateSmartKitchenScreen({
  projectId,
  initialDraft = null,
}: SimpleGenerateSmartKitchenScreenProps) {
  const [draft, setDraft] = useState<SmartKitchenWorkspaceDraft | null>(initialDraft);
  const [instructions, setInstructions] = useState('');
  const [generatedImages, setGeneratedImages] = useState<readonly GeneratedSmartKitchenImage[]>([]);
  const [generatedRoom, setGeneratedRoom] = useState<AiRoomInput | null>(null);
  const [generatedRoomFileName, setGeneratedRoomFileName] = useState('generated-smart-kitchen-room.json');
  const [selectedGeneratedImageIndex, setSelectedGeneratedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      return;
    }

    setDraft(loadSmartKitchenWorkspaceDraft(projectId));
  }, [initialDraft, projectId]);

  const attachment = draft?.attachment ?? null;
  const instructionCounterLabel = useMemo(
    () => formatInstructionCharacterCounter(instructions),
    [instructions],
  );
  const selectedGeneratedImage =
    selectedGeneratedImageIndex === null ? null : generatedImages[selectedGeneratedImageIndex] ?? null;
  const conceptGroups = useMemo(
    () => buildGeneratedImageConceptGroups(generatedImages),
    [generatedImages],
  );

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  function clearProgressInterval(): void {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function startGenerationProgress(): void {
    clearProgressInterval();
    setGenerationProgress(8);

    progressIntervalRef.current = window.setInterval(() => {
      setGenerationProgress((currentProgress) => {
        if (currentProgress >= 92) {
          return currentProgress;
        }

        const progressIncrement = currentProgress < 55 ? 8 : currentProgress < 78 ? 5 : 2;
        return Math.min(currentProgress + progressIncrement, 92);
      });
    }, 450);
  }

  useEffect(() => {
    if (!selectedGeneratedImage) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setSelectedGeneratedImageIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGeneratedImage]);

  function showPreviousGeneratedImage(): void {
    setSelectedGeneratedImageIndex((currentIndex) => {
      if (currentIndex === null || generatedImages.length === 0) {
        return currentIndex;
      }

      return currentIndex === 0 ? generatedImages.length - 1 : currentIndex - 1;
    });
  }

  function showNextGeneratedImage(): void {
    setSelectedGeneratedImageIndex((currentIndex) => {
      if (currentIndex === null || generatedImages.length === 0) {
        return currentIndex;
      }

      return currentIndex === generatedImages.length - 1 ? 0 : currentIndex + 1;
    });
  }

  async function handleGenerateImages(): Promise<void> {
    if (!attachment) {
      setErrorMessage('No attached project file is available for generation.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedImages([]);
    setGeneratedRoom(null);
    setSelectedGeneratedImageIndex(null);
    startGenerationProgress();

    try {
      const result = await generateSmartKitchenImages({
        projectId,
        attachedFileName: attachment.fileName,
        room: attachment.room,
        userInstructions: instructions.trim(),
      });

      clearProgressInterval();
      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setGeneratedImages(result.images);
      setGeneratedRoom(result.generatedRoom ?? result.generatedLayout?.room ?? null);
      setGeneratedRoomFileName(result.generatedRoomFileName ?? 'generated-smart-kitchen-room.json');
    } catch (error) {
      clearProgressInterval();
      setGenerationProgress(0);
      const message = error instanceof Error ? error.message : 'Image generation failed.';
      setErrorMessage(message);
    } finally {
      clearProgressInterval();
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F8FC]">
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0b1b31] via-[#091427] to-[#06101d] text-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-black uppercase tracking-[0.18em] text-[#0b1b31] shadow-[0_10px_25px_rgba(0,0,0,0.22)]">
            df
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">AI Kitchen Pro</p>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Workspace</p>
          </div>
        </div>

        <div className="px-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Generate Smart Kitchen
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4">
          <WorkspaceNavLink label="Generate Smart Kitchen" icon={Sparkles} isActive />
          <WorkspaceNavLink label="My Projects" icon={FolderOpen} />
          <WorkspaceNavLink label="Recent Designs" icon={House} />
          <WorkspaceNavLink label="Saved Favorites" icon={Heart} />
          <WorkspaceNavLink label="Workspace Settings" icon={Settings2} />
        </nav>

        <div className="px-4 pb-5">
          <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d3143] text-[#7ff0e6]">
              <CircleHelp className="h-5 w-5" />
            </div>
            <p className="mt-4 text-base font-semibold text-white">Need help?</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Get design tips or learn how to get the best results.
            </p>
            <button
              type="button"
              onClick={() => undefined}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Open Guide
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="grid h-[88px] grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center">
            <PrimaryButton
              variant="secondary"
              onClick={() => undefined}
              className="h-11 rounded-xl border-slate-200 px-4 text-sm font-semibold !text-[#0e796e] !flex-row !items-center"
            >
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Editor</span>
              </span>
            </PrimaryButton>
          </div>

          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              Generate Smart Kitchen
            </h1>
          </div>

          <div className="flex justify-end">
            <PrimaryButton
              variant="secondary"
              onClick={() => undefined}
              className="h-11 rounded-xl border-slate-200 px-4 text-sm font-semibold !text-slate-700 !flex-row !items-center"
            >
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <LogOut className="h-4 w-4" />
                <span>Exit Workspace</span>
              </span>
            </PrimaryButton>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <section className="w-full max-w-[820px] rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7faf7] text-[#0e8e87] shadow-[0_8px_24px_rgba(14,142,135,0.18)]">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">
                Generate Smart Kitchen Images
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Enter your design instructions and use the attached project file to generate beautiful
                kitchen images tailored to your vision.
              </p>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  Attached File
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6faf7] px-3 py-1 text-xs font-semibold text-[#0e8e87]">
                  <Check className="h-3.5 w-3.5" />
                  Attached
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#fbfdff] px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eff8ff] text-[#1f5f8d]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      Current Floor Plan / Project Data
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Project file • 2.4 MB</p>
                  </div>
                </div>

                {attachment ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Automatically attached from the editor export for project{' '}
                      {SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID}.
                    </p>
                    <PrimaryButton
                      variant="secondary"
                      onClick={() => downloadJsonFile(attachment.fileName, attachment.room)}
                      className="h-11 rounded-xl border-slate-200 px-4 text-sm font-semibold !text-slate-700 !flex-row !items-center"
                    >
                      <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                        <FileText className="h-4 w-4" />
                        <span>Download Attached File</span>
                      </span>
                    </PrimaryButton>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="smart-kitchen-instructions" className="text-sm font-semibold text-slate-900">
                  Instructions
                </label>
                <span className="text-xs font-medium text-slate-400">{instructionCounterLabel}</span>
              </div>

              <div className="relative">
                <textarea
                  id="smart-kitchen-instructions"
                  value={instructions}
                  maxLength={1000}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Describe the kitchen style, materials, colors, layout ideas, appliances, and mood you want the AI to generate..."
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pr-16 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7fded5] focus:ring-4 focus:ring-[#ddf7f4]"
                />
              </div>
            </div>

            <div className="mt-6">
              <PrimaryButton
                fullWidth
                disabled={!attachment || isGenerating}
                onClick={() => {
                  void handleGenerateImages();
                }}
                className="h-14 rounded-2xl !flex-row !items-center !justify-center !bg-[#16a8a0] text-base font-semibold shadow-[0_14px_28px_rgba(22,168,160,0.24)] hover:!bg-[#12978f] disabled:cursor-not-allowed disabled:opacity-90"
              >
                <span className="inline-flex items-center justify-center gap-3 whitespace-nowrap">
                  {isGenerating ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
                    />
                  ) : null}
                  <Sparkles className="h-5 w-5" />
                  <span>{isGenerating ? 'Generating Images...' : 'Generate Images'}</span>
                </span>
              </PrimaryButton>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {isGenerating ? <GeneratingImagesProgressPanel progress={generationProgress} /> : null}
          </section>

          {conceptGroups.length > 0 ? (
            <section className="mt-8 w-full max-w-[1200px] rounded-[24px] border border-[#dfeeea] bg-[#f8fcfb] px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ccefe0] bg-white text-[#2ea86f] shadow-[0_10px_24px_rgba(46,168,111,0.14)]">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#2d9f68]">Generation Complete!</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Here are your five AI-generated kitchen concepts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                {conceptGroups.map((group) => (
                  <GeneratedConceptImageRow
                    key={group.key}
                    group={group}
                    generatedImages={generatedImages}
                    onImageClick={setSelectedGeneratedImageIndex}
                  />
                ))}
              </div>

              <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
                <Sparkles className="h-4 w-4 text-[#0e8e87]" />
                <span>These designs are AI-generated concepts based on your instructions and floor plan.</span>
              </p>
            </section>
          ) : null}

          {generatedRoom ? (
            <section className="mt-8 w-full max-w-[820px]">
              <SectionCard
                title="Generated JSON"
                description="Download the AI-generated room data with the cabinet locations and layout summary."
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Generated room file ready</p>
                    <p className="mt-1 text-sm text-slate-600">
                      This JSON can be downloaded and reused as the next AI kitchen input.
                    </p>
                  </div>
                  <PrimaryButton
                    variant="secondary"
                    onClick={() => downloadJsonFile(generatedRoomFileName, generatedRoom)}
                    className="h-11 rounded-xl border-slate-200 px-4 text-sm font-semibold !text-slate-700 !flex-row !items-center"
                  >
                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                      <FileText className="h-4 w-4" />
                      <span>Download JSON</span>
                    </span>
                  </PrimaryButton>
                </div>
              </SectionCard>
            </section>
          ) : null}
        </div>
      </main>

      {selectedGeneratedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Generated Smart Kitchen concept ${(selectedGeneratedImageIndex ?? 0) + 1} preview`}
          onClick={() => setSelectedGeneratedImageIndex(null)}
        >
          <div
            className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Generated Concept
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  Concept {(selectedGeneratedImageIndex ?? 0) + 1} of {generatedImages.length}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGeneratedImageIndex(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b9f1ec]"
                aria-label="Close generated image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4 sm:p-6">
              {generatedImages.length > 1 ? (
                <button
                  type="button"
                  onClick={showPreviousGeneratedImage}
                  className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b9f1ec]"
                  aria-label="View previous generated image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}

              <img
                src={selectedGeneratedImage.imageUrl}
                alt={`Generated Smart Kitchen concept ${(selectedGeneratedImageIndex ?? 0) + 1}`}
                className="max-h-[72vh] w-full rounded-[20px] object-contain shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
              />

              {generatedImages.length > 1 ? (
                <button
                  type="button"
                  onClick={showNextGeneratedImage}
                  className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b9f1ec]"
                  aria-label="View next generated image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
              <span>{selectedGeneratedImage.mimeType}</span>
              <span>Click outside the image or press Escape to close.</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
