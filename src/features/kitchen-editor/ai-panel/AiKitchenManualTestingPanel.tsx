import { useRef, useState } from "react";
import type {
  KitchenAiDevelopmentImagePromptItem,
  KitchenAiDevelopmentImagePromptPackage,
} from "../ai-development/kitchenAiDevelopmentImagePromptPackage";
import type { KitchenAiDevelopmentPromptPackage } from "../ai-development/kitchenAiDevelopmentPromptPackage";
import type { KitchenAiPreDesigned } from "../ai-development/kitchenAiPreDesignedTypes";

const pastedPostDesignedPlaceholder = `Paste returned postDesigned.json here, for example:\n{\n  "schemaVersion": "kitchen-ai-postdesigned/v1",\n  ...\n}`;

type AiKitchenManualTestingPanelProps = Readonly<{
  preDesigned: KitchenAiPreDesigned | null;
  promptPackage: KitchenAiDevelopmentPromptPackage | null;
  imagePromptPackage: KitchenAiDevelopmentImagePromptPackage | null;
  imagePlanSummary: string | null;
  hasPostDesigned: boolean;
  disabled?: boolean;
  message: string | null;
  errors: readonly string[];
  onCopyPromptPackage: () => void;
  onDownloadPreDesigned: () => void;
  onDownloadDevelopmentPrompt: () => void;
  onDownloadPromptPackage: () => void;
  onUploadPostDesignedJson: (file: File) => void;
  onPastePostDesignedJson: (jsonText: string) => void;
  onCopyAllImageGenerationPrompts: () => void;
  onDownloadAllImageGenerationPrompts: () => void;
  onCopyImageGenerationPromptItem: (promptItem: KitchenAiDevelopmentImagePromptItem) => void;
  onDownloadImageGenerationPromptItem: (promptItem: KitchenAiDevelopmentImagePromptItem) => void;
}>;

export function AiKitchenManualTestingPanel({
  preDesigned,
  promptPackage,
  imagePromptPackage,
  imagePlanSummary,
  hasPostDesigned,
  disabled = false,
  message,
  errors,
  onCopyPromptPackage,
  onDownloadPreDesigned,
  onDownloadDevelopmentPrompt,
  onDownloadPromptPackage,
  onUploadPostDesignedJson,
  onPastePostDesignedJson,
  onCopyAllImageGenerationPrompts,
  onDownloadAllImageGenerationPrompts,
  onCopyImageGenerationPromptItem,
  onDownloadImageGenerationPromptItem,
}: AiKitchenManualTestingPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pastedPostDesignedJson, setPastedPostDesignedJson] = useState("");
  const hasManualInput = preDesigned !== null && promptPackage !== null;
  const controlsDisabled = disabled || !hasManualInput;
  const canImportPastedJson = !controlsDisabled && pastedPostDesignedJson.trim().length > 0;
  const imagePromptDisabled = disabled || !hasManualInput || !hasPostDesigned || imagePromptPackage === null;

  return (
    <section className="rounded-xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Manual AI testing</p>
        <p className="mt-2 text-xs leading-5 text-amber-900">
          Copy or download the Development prompt with preDesigned.json, send it to an external AI chat, then upload or paste the returned postDesigned.json to map the design back into the editor.
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={onCopyPromptPackage}
          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy Prompt + preDesigned.json
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={onDownloadPreDesigned}
            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download preDesigned.json
          </button>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={onDownloadDevelopmentPrompt}
            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download Prompt Only
          </button>
        </div>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={onDownloadPromptPackage}
          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download Prompt + preDesigned.txt
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Upload postDesigned.json
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => setIsPasteOpen((value) => !value)}
          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPasteOpen ? "Hide Paste postDesigned.json" : "Paste postDesigned.json"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (file !== undefined) {
              onUploadPostDesignedJson(file);
            }
          }}
        />
      </div>

      {isPasteOpen ? (
        <div className="mt-3 rounded-lg border border-amber-100 bg-white/80 p-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-amber-700" htmlFor="post-designed-json-paste">
            Paste returned JSON
          </label>
          <textarea
            id="post-designed-json-paste"
            value={pastedPostDesignedJson}
            disabled={controlsDisabled}
            placeholder={pastedPostDesignedPlaceholder}
            onChange={(event) => setPastedPostDesignedJson(event.target.value)}
            className="mt-2 min-h-36 w-full resize-y rounded-lg border border-amber-100 bg-white px-3 py-2 font-mono text-[11px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="button"
            disabled={!canImportPastedJson}
            onClick={() => onPastePostDesignedJson(pastedPostDesignedJson)}
            className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Import pasted postDesigned.json
          </button>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-amber-100 bg-white/70 p-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Image generation prompts</p>
        <p className="mt-1 text-xs leading-5 text-amber-900">
          After postDesigned.json is ready, Copy All Image Prompts gives one prompt that asks the image AI to generate several separate images. Individual prompts are still available if your image tool only supports one image at a time.
        </p>
        {imagePlanSummary ? (
          <p className="mt-2 whitespace-pre-line rounded-lg border border-amber-100 bg-white/80 p-2 text-xs leading-5 text-amber-900">
            {imagePlanSummary}
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={imagePromptDisabled}
            onClick={onCopyAllImageGenerationPrompts}
            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy All Image Prompts
          </button>
          <button
            type="button"
            disabled={imagePromptDisabled}
            onClick={onDownloadAllImageGenerationPrompts}
            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download All Image Prompts
          </button>
        </div>
        {imagePromptPackage && imagePromptPackage.perImagePrompts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {imagePromptPackage.perImagePrompts.map((promptItem, index) => (
              <div key={promptItem.id} className="rounded-lg border border-amber-100 bg-white p-2">
                <p className="text-xs font-semibold text-amber-950">{index + 1}. {promptItem.label}</p>
                <p className="mt-1 truncate text-[11px] text-amber-700">{promptItem.fileName}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={imagePromptDisabled}
                    onClick={() => onCopyImageGenerationPromptItem(promptItem)}
                    className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy Prompt
                  </button>
                  <button
                    type="button"
                    disabled={imagePromptDisabled}
                    onClick={() => onDownloadImageGenerationPromptItem(promptItem)}
                    className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download Prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-xs leading-5 text-amber-900">{message}</p> : null}
      {errors.length > 0 ? (
        <div className="mt-3 rounded-lg border border-rose-100 bg-white/80 p-2 text-xs leading-5 text-rose-700">
          <p className="font-semibold">Manual testing error</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {errors.slice(0, 4).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
