'use client';

import { useState, type ReactNode } from 'react';

const MAX_INSTRUCTION_LENGTH = 1000;

export interface SimpleGenerateSmartKitchenScreenProps {
  readonly projectId: string;
}

function SparklesIcon({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3.5L13.82 8.18L18.5 10L13.82 11.82L12 16.5L10.18 11.82L5.5 10L10.18 8.18L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18 14.5L18.82 16.68L21 17.5L18.82 18.32L18 20.5L17.18 18.32L15 17.5L17.18 16.68L18 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 15.5L6.08 17.02L7.6 17.6L6.08 18.18L5.5 19.7L4.92 18.18L3.4 17.6L4.92 17.02L5.5 15.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'h-5 w-5' }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 5L5 12L12 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExitIcon({ className = 'h-5 w-5' }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 7.5V6.25C15 5.56 14.44 5 13.75 5H5.25C4.56 5 4 5.56 4 6.25V17.75C4 18.44 4.56 19 5.25 19H13.75C14.44 19 15 18.44 15 17.75V16.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M10 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M17 9L20 12L17 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon({ className = 'h-8 w-8' }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.25 3.5H13L18.75 9.25V20.5H7.25V3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13 3.75V9.25H18.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.75 13H16.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.75 16H14.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 10.75L12 4L20.5 10.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.25 9.5V20H17.75V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookmarkIcon({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 4.75H17V19.25L12 16.25L7 19.25V4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon({ className = 'h-6 w-6' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.75V6M12 18V20.25M4.35 7.5L6.3 8.62M17.7 15.38L19.65 16.5M4.35 16.5L6.3 15.38M17.7 8.62L19.65 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon({ className = 'h-4 w-4' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 5H19V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L19 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 14V18.75C19 19.44 18.44 20 17.75 20H5.25C4.56 20 4 19.44 4 18.75V6.25C4 5.56 4.56 5 5.25 5H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12.5L9.25 16.75L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarNavItem({
  label,
  icon,
  active = false,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly active?: boolean;
}) {
  return (
    <div
      className={[
        'relative flex h-16 items-center gap-5 px-6 text-[15px] font-semibold transition',
        active ? 'bg-[#122b4a] text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      {active ? <span className="absolute left-0 top-0 h-full w-1 bg-[#10b6c2]" aria-hidden="true" /> : null}
      <span
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          active ? 'bg-[#10b6c2] text-white' : 'text-slate-300',
        ].join(' ')}
      >
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[270px] flex-col bg-[#071a31] text-white shadow-2xl">
      <div className="flex h-[90px] items-center gap-4 border-b border-white/10 px-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#19c6c9] to-[#0791a6] text-xl font-bold italic shadow-lg shadow-cyan-950/30">
          df
        </div>
        <div className="text-lg font-bold tracking-tight">AI Kitchen Pro</div>
      </div>

      <div className="border-b border-white/10 px-5 py-8 text-sm font-semibold uppercase tracking-wide text-slate-300">
        Generate Smart Kitchen
      </div>

      <nav aria-label="Generate Smart Kitchen navigation" className="flex-1 py-0">
        <SidebarNavItem label="Generate Smart Kitchen" active icon={<SparklesIcon className="h-5 w-5" />} />
        <SidebarNavItem label="My Projects" icon={<HomeIcon />} />
        <SidebarNavItem label="Recent Designs" icon={<ClockIcon />} />
        <SidebarNavItem label="Saved Favorites" icon={<BookmarkIcon />} />
        <SidebarNavItem label="Workspace Settings" icon={<GearIcon />} />
      </nav>

      <div className="p-4 pb-8">
        <div className="rounded-lg border border-white/15 bg-white/[0.03] p-5 text-slate-200 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold">
              ?
            </span>
            <p className="font-semibold">Need help?</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Get design tips or learn how to get the best results.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Open Guide
            <ExternalLinkIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function SimpleGenerateSmartKitchenScreen({ projectId }: SimpleGenerateSmartKitchenScreenProps) {
  const [instructions, setInstructions] = useState('');
  const characterCount = instructions.length;

  return (
    <main data-project-id={projectId} className="min-h-screen bg-[#f6f9fc] text-[#08142f]">
      <Sidebar />

      <div className="min-h-screen pl-[270px]">
        <header className="relative z-10 flex h-[90px] items-center border-b border-[#dce5ee] bg-white px-6 shadow-sm">
          <a
            href="/editor"
            className="inline-flex h-12 items-center gap-3 rounded-lg border border-[#d8e4ee] bg-white px-5 text-base font-bold text-[#0399a9] shadow-sm transition hover:border-[#0bafbc] hover:bg-[#f5fdfe]"
          >
            <ArrowLeftIcon />
            Back to Editor
          </a>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-extrabold tracking-tight text-[#07142d]">
            Generate Smart Kitchen
          </h1>

          <a
            href="/"
            className="ml-auto inline-flex h-12 items-center gap-3 rounded-lg border border-[#d8e4ee] bg-white px-5 text-base font-bold text-[#07142d] shadow-sm transition hover:border-[#b9c9d8] hover:bg-slate-50"
          >
            <ExitIcon />
            Exit Workspace
          </a>
        </header>

        <section className="flex min-h-[calc(100vh-90px)] items-start justify-center px-8 py-[58px]">
          <div className="w-full max-w-[835px] rounded-xl border border-[#dbe5ef] bg-white px-9 pb-8 pt-9 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
            <div className="flex flex-col items-center text-center">
              <SparklesIcon className="h-10 w-10 text-[#069fac]" />
              <h2 className="mt-7 text-[30px] font-extrabold leading-tight tracking-tight text-[#07142d]">
                Generate Smart Kitchen Images
              </h2>
              <p className="mt-5 max-w-[650px] text-[17px] leading-8 text-[#526581]">
                Enter your design instructions and use the attached project file to generate
                <br />
                beautiful kitchen images tailored to your vision.
              </p>
            </div>

            <div className="mt-11">
              <p className="text-base font-extrabold text-[#07142d]">Attached File</p>
              <div className="mt-3 flex min-h-[82px] items-center gap-5 rounded-lg border border-[#d8e4ee] bg-white px-6 shadow-sm">
                <FileIcon className="h-9 w-9 shrink-0 text-[#079fac]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold text-[#07142d]">
                    Current Floor Plan / Project Data
                  </p>
                  <p className="mt-1 text-base text-[#6b7d99]">Project file • 2.4 MB</p>
                </div>
                <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#e8f7f8] px-4 text-base font-bold text-[#079fac]">
                  <CheckIcon />
                  Attached
                </span>
              </div>
            </div>

            <div className="mt-10">
              <label htmlFor="smart-kitchen-instructions" className="block text-base font-extrabold text-[#07142d]">
                Instructions
              </label>
              <div className="relative mt-3">
                <textarea
                  id="smart-kitchen-instructions"
                  value={instructions}
                  maxLength={MAX_INSTRUCTION_LENGTH}
                  onChange={(event) => setInstructions(event.currentTarget.value)}
                  placeholder="Describe the kitchen style, materials, colors, layout ideas, appliances, and&#10;mood you want the AI to generate..."
                  className="min-h-[220px] w-full resize-none rounded-lg border border-[#cfdce8] bg-white px-5 py-5 pr-24 text-[18px] leading-8 text-[#07142d] outline-none transition placeholder:text-[#8491ad] focus:border-[#0aa8b5] focus:ring-4 focus:ring-cyan-100"
                />
                <p className="pointer-events-none absolute bottom-6 right-5 text-base font-medium text-[#6f7e98]">
                  {characterCount} / {MAX_INSTRUCTION_LENGTH}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-7 inline-flex h-[60px] w-full items-center justify-center gap-4 rounded-lg bg-gradient-to-r from-[#0aa8b5] to-[#029aa7] text-[22px] font-extrabold text-white shadow-[0_10px_24px_rgba(0,162,173,0.25)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0aa8b5]"
            >
              <SparklesIcon className="h-7 w-7" />
              Generate Images
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
