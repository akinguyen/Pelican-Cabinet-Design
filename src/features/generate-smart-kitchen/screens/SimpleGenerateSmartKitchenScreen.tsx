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
  ImageIcon,
  House,
  LogOut,
  Settings2,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { PrimaryButton } from '../components/shared/PrimaryButton';
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


interface GeneratedImageConceptGroup {
  readonly key: string;
  readonly label: string;
  readonly images: readonly GeneratedSmartKitchenImage[];
  readonly startIndex: number;
}

function buildGeneratedImageConceptGroups(
  images: readonly GeneratedSmartKitchenImage[],
): readonly GeneratedImageConceptGroup[] {
  if (images.length === 0) {
    return [];
  }

  type ImageWithConceptMetadata = GeneratedSmartKitchenImage &
    Partial<{
      conceptId: string;
      conceptLabel: string;
      conceptName: string;
      conceptIndex: number;
      conceptNumber: number;
    }>;

  const imagesWithMetadata = images as readonly ImageWithConceptMetadata[];
  const conceptGroups = new Map<string, GeneratedImageConceptGroup>();
  let foundConceptMetadata = false;

  imagesWithMetadata.forEach((image, index) => {
    const conceptKey =
      image.conceptId ??
      (typeof image.conceptIndex === 'number' ? `concept-${image.conceptIndex}` : undefined) ??
      (typeof image.conceptNumber === 'number' ? `concept-${image.conceptNumber}` : undefined);

    if (!conceptKey) {
      return;
    }

    foundConceptMetadata = true;
    const conceptLabel =
      image.conceptLabel ??
      image.conceptName ??
      (typeof image.conceptNumber === 'number'
        ? `Concept ${image.conceptNumber}`
        : typeof image.conceptIndex === 'number'
          ? `Concept ${image.conceptIndex + 1}`
          : `Concept ${conceptGroups.size + 1}`);

    const existingGroup = conceptGroups.get(conceptKey);
    if (existingGroup) {
      conceptGroups.set(conceptKey, {
        ...existingGroup,
        images: [...existingGroup.images, image],
      });
      return;
    }

    conceptGroups.set(conceptKey, {
      key: conceptKey,
      label: conceptLabel,
      images: [image],
      startIndex: index,
    });
  });

  if (foundConceptMetadata && conceptGroups.size > 0) {
    return Array.from(conceptGroups.values());
  }

  if (images.length <= 5) {
    return images.map((image, index) => ({
      key: image.id,
      label: `Concept ${index + 1}`,
      images: [image],
      startIndex: index,
    }));
  }

  const conceptCount = 5;
  const chunkSize = Math.ceil(images.length / conceptCount);
  const groupedImages: GeneratedImageConceptGroup[] = [];

  for (let conceptIndex = 0; conceptIndex < conceptCount; conceptIndex += 1) {
    const startIndex = conceptIndex * chunkSize;
    const conceptImages = images.slice(startIndex, startIndex + chunkSize);

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

function GeneratedImageSkeletonCard() {
  return (
    <figure
      className="flex flex-col items-center justify-center border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      style={{
        minHeight: '190px',
        borderRadius: '18px',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 shadow-sm"
        style={{
          width: '76px',
          height: '76px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
        }}
      >
        <ImageIcon className="h-8 w-8" />
      </div>
      <div
        className="overflow-hidden rounded-full bg-slate-200"
        style={{
          marginTop: '34px',
          width: '104px',
          height: '7px',
        }}
      >
        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#13bbb3] via-[#8ee8df] to-transparent" />
      </div>
    </figure>
  );
}

function GeneratingImagesProgressPanel({ progress }: { readonly progress: number }) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <section className="mt-6 rounded-[24px] border border-[#dfeeea] bg-[#f8fcfb] px-4 py-5 sm:px-5 sm:py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ccefe9] bg-[#e9fbf8] text-[#0e8e87] shadow-[0_10px_24px_rgba(14,142,135,0.14)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Generating Images
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Creating five kitchen concepts from the attached project file...
          </p>

          <div
            className="overflow-hidden rounded-full shadow-inner"
            role="progressbar"
            aria-label="Image generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
            style={{
              width: '100%',
              height: '8px',
              marginTop: '18px',
              backgroundColor: '#d9e1ef',
            }}
          >
            <div
              className="rounded-full shadow-[0_0_18px_rgba(22,184,176,0.36)] transition-[width] duration-500 ease-out"
              style={{
                width: `${safeProgress}%`,
                height: '100%',
                backgroundColor: '#16b8b0',
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '1.25rem',
          marginTop: '42px',
        }}
      >
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
        <GeneratedImageSkeletonCard />
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <Sparkles className="h-4 w-4 text-[#0e8e87]" />
        <span>This may take a few moments. You will see five kitchen concepts here when ready.</span>
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
  const rowRef = useRef<HTMLDivElement | null>(null);

  function scrollRow(direction: 'left' | 'right'): void {
    rowRef.current?.scrollBy({
      left: direction === 'left' ? -420 : 420,
      behavior: 'smooth',
    });
  }

  return (
    <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">{group.label}</h4>
          <p className="mt-1 text-xs text-slate-500">
            {group.images.length > 1
              ? `${group.images.length} generated image views for this concept.`
              : 'Generated kitchen concept image.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#eefaf8] px-3 py-1 text-xs font-semibold text-[#0e8e87]">
            {group.images.length} image{group.images.length === 1 ? '' : 's'}
          </span>
          {group.images.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollRow('left')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label={`Scroll ${group.label} images left`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRow('right')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label={`Scroll ${group.label} images right`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={rowRef} className="flex gap-4 overflow-x-auto p-4 pb-5">
        {group.images.map((image, imageIndex) => {
          const generatedImageIndex = generatedImages.findIndex((generatedImage) => generatedImage.id === image.id);
          const safeImageIndex = generatedImageIndex >= 0 ? generatedImageIndex : group.startIndex + imageIndex;

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageClick(safeImageIndex)}
              className="group/image min-w-[280px] overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.08)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)] focus-visible:ring-4 focus-visible:ring-[#b9f1ec] sm:min-w-[360px] lg:min-w-[430px]"
              aria-label={`Open ${group.label} image ${imageIndex + 1}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={image.imageUrl}
                  alt={`${group.label} image ${imageIndex + 1}`}
                  className="h-full w-full object-cover transition duration-300 group-hover/image:scale-[1.02]"
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover/image:opacity-100">
                  Click to view larger
                </span>
              </div>
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
  const [usePlaceholderImages, setUsePlaceholderImages] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<readonly GeneratedSmartKitchenImage[]>([]);
  const [selectedGeneratedImageIndex, setSelectedGeneratedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
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
  const selectedGeneratedImageConceptGroup = useMemo(() => {
    if (!selectedGeneratedImage) {
      return null;
    }

    return (
      conceptGroups.find((group) =>
        group.images.some((image) => image.id === selectedGeneratedImage.id),
      ) ?? null
    );
  }, [conceptGroups, selectedGeneratedImage]);
  const selectedGeneratedImagePositionInConcept =
    selectedGeneratedImageConceptGroup && selectedGeneratedImage
      ? selectedGeneratedImageConceptGroup.images.findIndex(
          (image) => image.id === selectedGeneratedImage.id,
        )
      : -1;

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

  function getAdjacentGeneratedImageIndex(
    currentIndex: number,
    direction: 'previous' | 'next',
  ): number {
    const currentImage = generatedImages[currentIndex];
    if (!currentImage) {
      return currentIndex;
    }

    const currentGroup = conceptGroups.find((group) =>
      group.images.some((image) => image.id === currentImage.id),
    );

    if (!currentGroup || currentGroup.images.length <= 1) {
      return currentIndex;
    }

    const currentLocalIndex = currentGroup.images.findIndex((image) => image.id === currentImage.id);
    if (currentLocalIndex < 0) {
      return currentIndex;
    }

    const nextLocalIndex =
      direction === 'previous'
        ? (currentLocalIndex - 1 + currentGroup.images.length) % currentGroup.images.length
        : (currentLocalIndex + 1) % currentGroup.images.length;

    const nextImage = currentGroup.images[nextLocalIndex];
    const nextGlobalIndex = generatedImages.findIndex((image) => image.id === nextImage.id);

    return nextGlobalIndex >= 0 ? nextGlobalIndex : currentIndex;
  }

  function showPreviousGeneratedImage(): void {
    setSelectedGeneratedImageIndex((currentIndex) =>
      currentIndex === null ? currentIndex : getAdjacentGeneratedImageIndex(currentIndex, 'previous'),
    );
  }

  function showNextGeneratedImage(): void {
    setSelectedGeneratedImageIndex((currentIndex) =>
      currentIndex === null ? currentIndex : getAdjacentGeneratedImageIndex(currentIndex, 'next'),
    );
  }

  function handleDownloadAll(): void {
    generatedImages.forEach((image, index) => {
      const downloadLink = document.createElement('a');
      downloadLink.href = image.imageUrl;
      downloadLink.download = `smart-kitchen-concept-${index + 1}.png`;
      downloadLink.rel = 'noopener';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
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
    setSelectedGeneratedImageIndex(null);
    startGenerationProgress();

    try {
      const result = await generateSmartKitchenImages({
        projectId,
        attachedFileName: attachment.fileName,
        room: attachment.room,
        userInstructions: instructions.trim(),
        usePlaceholderImages,
      });

      clearProgressInterval();
      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setGeneratedImages(result.images);
    } catch (error) {
      clearProgressInterval();
      setGenerationProgress(0);
      const message = error instanceof Error ? error.message : 'Image generation failed.';
      setErrorMessage(message);
    } finally {
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
          <section
            className={joinClassNames(
              'w-full rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10',
              isGenerating || conceptGroups.length > 0 ? 'max-w-[1280px]' : 'max-w-[820px]',
            )}
          >
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
                  <p className="mt-4 text-xs font-medium text-slate-500">
                    Automatically attached from the editor export for project{' '}
                    {SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID}.
                  </p>
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

            {conceptGroups.length > 0 ? (
              <section className="mt-6 rounded-[24px] border border-[#dfeeea] bg-[#f8fcfb] px-4 py-4 sm:px-5 sm:py-5">
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

                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d6ece6] bg-white px-4 text-sm font-semibold text-[#2d9f68] shadow-sm transition hover:bg-[#f2fbf7]"
                  >
                    Download All
                  </button>
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
          </section>
        </div>
      </main>

      {selectedGeneratedImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedGeneratedImageConceptGroup?.label ?? 'Generated concept'} image preview`}
          onClick={() => setSelectedGeneratedImageIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px',
            backgroundColor: 'rgba(2, 13, 28, 0.78)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 1080px)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: '22px',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              background: 'linear-gradient(180deg, #061b2e 0%, #031426 100%)',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '22px 28px 14px',
              }}
            >
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, lineHeight: 1.2 }}>
                  {selectedGeneratedImageConceptGroup?.label ?? 'Generated Concept'}
                </h3>
                <p
                  style={{
                    marginTop: '8px',
                    color: '#42d7c8',
                    fontSize: '15px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Image {selectedGeneratedImagePositionInConcept >= 0 ? selectedGeneratedImagePositionInConcept + 1 : 1} of{' '}
                  {selectedGeneratedImageConceptGroup?.images.length ?? 1}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGeneratedImageIndex(null)}
                aria-label="Close generated image preview"
                style={{
                  width: '48px',
                  height: '48px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.32)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div
              style={{
                position: 'relative',
                minHeight: 0,
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 28px 20px',
              }}
            >
              {(selectedGeneratedImageConceptGroup?.images.length ?? 0) > 1 ? (
                <button
                  type="button"
                  onClick={showPreviousGeneratedImage}
                  aria-label="View previous image in this concept"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    zIndex: 10,
                    width: '54px',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-50%)',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    color: '#ffffff',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
              ) : null}

              <div
                style={{
                  width: '100%',
                  maxHeight: '60vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <img
                  src={selectedGeneratedImage.imageUrl}
                  alt={`${selectedGeneratedImageConceptGroup?.label ?? 'Generated concept'} image ${
                    selectedGeneratedImagePositionInConcept >= 0 ? selectedGeneratedImagePositionInConcept + 1 : 1
                  }`}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '14px',
                  }}
                />
              </div>

              {(selectedGeneratedImageConceptGroup?.images.length ?? 0) > 1 ? (
                <button
                  type="button"
                  onClick={showNextGeneratedImage}
                  aria-label="View next image in this concept"
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    zIndex: 10,
                    width: '54px',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-50%)',
                    borderRadius: '9999px',
                    border: '2px solid #34d7ca',
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    color: '#ffffff',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              ) : null}
            </div>

            {(selectedGeneratedImageConceptGroup?.images.length ?? 0) > 1 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  padding: '0 28px 24px',
                }}
              >
                {selectedGeneratedImageConceptGroup?.images.map((image, imageIndex) => {
                  const thumbnailGlobalIndex = generatedImages.findIndex(
                    (generatedImage) => generatedImage.id === image.id,
                  );
                  const isSelected = image.id === selectedGeneratedImage.id;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        if (thumbnailGlobalIndex >= 0) {
                          setSelectedGeneratedImageIndex(thumbnailGlobalIndex);
                        }
                      }}
                      aria-label={`View image ${imageIndex + 1} in ${selectedGeneratedImageConceptGroup?.label ?? 'this concept'}`}
                      style={{
                        width: '112px',
                        height: '72px',
                        overflow: 'hidden',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #34d7ca' : '2px solid rgba(255, 255, 255, 0.22)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        opacity: isSelected ? 1 : 0.78,
                        boxShadow: isSelected ? '0 0 0 2px rgba(52, 215, 202, 0.24)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`${selectedGeneratedImageConceptGroup?.label ?? 'Generated concept'} thumbnail ${
                          imageIndex + 1
                        }`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
