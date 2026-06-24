type AiDesignInProgressOverlayProps = {
  isVisible: boolean;
};

export function AiDesignInProgressOverlay({ isVisible }: AiDesignInProgressOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
      <div className="mx-6 max-w-sm rounded-2xl border border-white/70 bg-white/95 px-7 py-6 text-center shadow-2xl shadow-slate-900/20">
        <div className="relative mx-auto h-16 w-16">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-200/60" />
          <span className="absolute inset-1 rounded-full bg-sky-50" />
          <span className="absolute inset-2 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
          <span className="absolute inset-5 animate-pulse rounded-full bg-sky-400 shadow-lg shadow-sky-300/70" />
        </div>
        <p className="mt-5 text-base font-semibold text-slate-950">
          Designing in progress
          <span className="ml-1 inline-flex w-6 justify-start text-sky-500" aria-hidden="true">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce [animation-delay:120ms]">.</span>
            <span className="animate-bounce [animation-delay:240ms]">.</span>
          </span>
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          AI is arranging cabinets, surfaces, appliances, and fixtures.
        </p>
      </div>
    </div>
  );
}
