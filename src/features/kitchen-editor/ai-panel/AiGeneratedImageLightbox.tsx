"use client";

import { useEffect, useMemo } from "react";
import type { AiKitchenDesignImage } from "../ai-development/aiKitchenDevelopmentTypes";

type AiGeneratedImageLightboxProps = {
  image: AiKitchenDesignImage | null;
  images: readonly AiKitchenDesignImage[];
  onSelectImage: (image: AiKitchenDesignImage) => void;
  onClose: () => void;
};

export function AiGeneratedImageLightbox({
  image,
  images,
  onSelectImage,
  onClose,
}: AiGeneratedImageLightboxProps) {
  const selectedIndex = useMemo(() => {
    if (image === null) {
      return -1;
    }

    return images.findIndex((candidate) => candidate.id === image.id);
  }, [image, images]);

  const selectedImage = selectedIndex >= 0 ? images[selectedIndex] : image;
  const hasMultipleImages = images.length > 1 && selectedImage !== null;

  useEffect(() => {
    if (selectedImage === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectRelativeImage(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectRelativeImage(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, images, onClose, onSelectImage, selectedImage, selectedIndex]);

  if (selectedImage === null) {
    return null;
  }

  function selectRelativeImage(direction: -1 | 1) {
    if (!hasMultipleImages) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (currentIndex + direction + images.length) % images.length;
    const nextImage = images[nextIndex];

    if (nextImage !== undefined) {
      onSelectImage(nextImage);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-full w-full max-w-7xl flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-2 text-white drop-shadow">
          <div>
            <p className="text-sm font-semibold">{selectedImage.label}</p>
            <p className="text-xs text-slate-200">Development mode preview</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-2 pb-1">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            {hasMultipleImages ? (
              <button
                type="button"
                aria-label="Previous image"
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/30 bg-transparent text-4xl font-semibold leading-none text-white drop-shadow-lg transition hover:border-sky-200 hover:text-sky-200 sm:flex"
                onClick={() => selectRelativeImage(-1)}
              >
                &lt;
              </button>
            ) : null}

            <img
              className="min-w-0 max-h-[calc(100vh-220px)] max-w-full rounded-xl object-contain shadow-2xl"
              src={selectedImage.url}
              alt={selectedImage.label}
            />

            {hasMultipleImages ? (
              <button
                type="button"
                aria-label="Next image"
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/30 bg-transparent text-4xl font-semibold leading-none text-white drop-shadow-lg transition hover:border-sky-200 hover:text-sky-200 sm:flex"
                onClick={() => selectRelativeImage(1)}
              >
                &gt;
              </button>
            ) : null}
          </div>

          {hasMultipleImages ? (
            <div className="mt-4 flex justify-center overflow-x-auto px-2 pb-1">
              <div className="inline-flex items-stretch justify-center gap-2 rounded-2xl bg-transparent p-1">
                {images.map((thumbnailImage, index) => {
                  const isSelected = thumbnailImage.id === selectedImage.id;

                  return (
                    <button
                      key={thumbnailImage.id}
                      type="button"
                      aria-label={`View ${thumbnailImage.label}`}
                      aria-current={isSelected ? "true" : undefined}
                      className={[
                        "w-28 shrink-0 rounded-xl border p-1 text-left backdrop-blur-sm transition",
                        isSelected
                          ? "border-sky-300 bg-sky-500/15 ring-2 ring-sky-200"
                          : "border-white/30 bg-white/10 hover:border-sky-200 hover:bg-white/20",
                      ].join(" ")}
                      onClick={() => onSelectImage(thumbnailImage)}
                    >
                      <img className="h-16 w-full rounded-lg object-cover" src={thumbnailImage.url} alt={thumbnailImage.label} />
                      <span
                        className={[
                          "mt-1 block truncate px-1 text-[11px] font-semibold drop-shadow",
                          isSelected ? "text-sky-100" : "text-white",
                        ].join(" ")}
                      >
                        {index + 1}. {thumbnailImage.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
