import type { AiKitchenDesignImage } from "./aiKitchenDevelopmentTypes";
import type { KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";

export function createKitchenAiDevelopmentImageCards(
  imageGenerationPlan: readonly KitchenAiPostDesignedImagePlan[],
  options: { sourceLabel?: string } = {},
): AiKitchenDesignImage[] {
  return imageGenerationPlan.map((imagePlan, index) => ({
    id: imagePlan.id,
    label: imagePlan.label || `Design Image ${index + 1}`,
    url: createMockImageDataUrl(
      imagePlan.label || `Design Image ${index + 1}`,
      imagePlan.viewType === "corner" ? "Eye-level corner view" : "Eye-level straight-ahead view",
      options.sourceLabel ?? "Preview generated from postDesigned.json imageGenerationPlan",
    ),
  }));
}

function createMockImageDataUrl(title: string, subtitle: string, sourceLabel: string): string {
  const escapedTitle = escapeXml(title);
  const escapedSubtitle = escapeXml(subtitle);
  const escapedSourceLabel = escapeXml(sourceLabel);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
    <linearGradient id="cabinet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" fill="#e2e8f0"/>
  <path d="M70 80H890V490H70Z" fill="url(#wall)"/>
  <path d="M70 490H890L820 585H140Z" fill="#cbd5e1"/>
  <rect x="150" y="300" width="120" height="185" rx="8" fill="url(#cabinet)" stroke="#64748b" stroke-width="4"/>
  <rect x="284" y="300" width="120" height="185" rx="8" fill="url(#cabinet)" stroke="#64748b" stroke-width="4"/>
  <rect x="418" y="300" width="120" height="185" rx="8" fill="url(#cabinet)" stroke="#64748b" stroke-width="4"/>
  <rect x="552" y="300" width="120" height="185" rx="8" fill="url(#cabinet)" stroke="#64748b" stroke-width="4"/>
  <rect x="686" y="230" width="120" height="255" rx="8" fill="#e5e7eb" stroke="#64748b" stroke-width="4"/>
  <rect x="150" y="206" width="120" height="74" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>
  <rect x="284" y="206" width="120" height="74" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>
  <rect x="418" y="206" width="120" height="74" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/>
  <rect x="145" y="287" width="532" height="18" rx="9" fill="#94a3b8"/>
  <circle cx="478" cy="230" r="26" fill="#bfdbfe" stroke="#3b82f6" stroke-width="4"/>
  <text x="480" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#0f172a">${escapedTitle}</text>
  <text x="480" y="135" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#475569">${escapedSubtitle}</text>
  <text x="480" y="592" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#475569">${escapedSourceLabel}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
