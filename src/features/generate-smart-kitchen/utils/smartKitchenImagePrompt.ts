import type { AiRoomInput } from '../../../../lib/ai/types';

export interface SmartKitchenImagePromptInput {
  readonly projectId: string;
  readonly attachedFileName: string;
  readonly room: AiRoomInput;
  readonly userInstructions: string;
  readonly conceptIndex?: number;
  readonly conceptCount?: number;
  readonly imagesPerConcept?: number;
}

export const SMART_KITCHEN_IMAGE_SYSTEM_PROMPT = [
  'You are generating customer-facing kitchen concept images for a cabinet sales workspace.',
  'Use the supplied room JSON as the source of truth for walls, openings, cabinet placement, and layout constraints.',
  'Generate exactly five concepts.',
  'For each concept, generate three separate, standalone photorealistic kitchen renderings for the same kitchen space.',
  'Each image must show one complete kitchen scene only.',
  'Vary composition, camera angle, lighting, and styling slightly across the three images in each concept.',
  'Do not create collages, contact sheets, multi-panel layouts, split screens, before-and-after compositions, or multiple views inside a single image.',
  'Do not add explanatory text, labels, watermarking, callouts, or UI elements inside the images.',
  'Make the output polished, realistic, and suitable for a sales presentation.',
].join(' ');

export function buildSmartKitchenImagePrompt({
  projectId,
  attachedFileName,
  room,
  userInstructions,
  conceptIndex,
  conceptCount = 5,
  imagesPerConcept = 3,
}: SmartKitchenImagePromptInput): string {
  const instructionText = userInstructions.trim();
  const hasConceptContext = typeof conceptIndex === 'number';

  return [
    'Smart Kitchen generation brief:',
    `Project ID: ${projectId}`,
    `Attached file: ${attachedFileName}`,
    hasConceptContext ? `Concept focus: Concept ${conceptIndex + 1} of ${conceptCount}` : `Concepts requested: ${conceptCount}`,
    hasConceptContext
      ? `Generate exactly ${imagesPerConcept} standalone images for this concept.`
      : `Generate exactly ${conceptCount * imagesPerConcept} standalone images grouped as ${conceptCount} concepts with ${imagesPerConcept} images per concept.`,
    '',
    'System guidance:',
    SMART_KITCHEN_IMAGE_SYSTEM_PROMPT,
    '',
    'Attached room JSON:',
    JSON.stringify(room, null, 2),
    '',
    'User instructions:',
    instructionText || '(no additional user instructions provided)',
  ].join('\n');
}
