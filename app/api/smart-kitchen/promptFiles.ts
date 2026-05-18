import { readFile } from "node:fs/promises";
import path from "node:path";

const SMART_KITCHEN_PROMPT_DIR = path.join(
  process.cwd(),
  "prompts",
  "structured-test"
);
const SMART_KITCHEN_PROMPT_OVERVIEW_PATH = path.join(
  SMART_KITCHEN_PROMPT_DIR,
  "prompt-overview.txt"
);
const SMART_KITCHEN_RULE_FILES = [
  "rule-input-and-walls.txt",
  "rule-zone-planning.txt",
  "rule-corner-and-blind-cabinets.txt",
  "rule-object-placement.txt",
  "rule-fillers-and-end-panels.txt",
  "rule-output-json.txt",
  "rule-final-self-check.txt",
] as const;

export const SMART_KITCHEN_OUTPUT_SHAPE_PATH = path.join(
  SMART_KITCHEN_PROMPT_DIR,
  "output-shape.txt"
);

export async function readRequiredTextFile(filePath: string, label: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown file read error.";
    throw new Error(`Unable to read ${label} at ${filePath}. ${reason}`);
  }
}

export async function readStructuredSmartKitchenPrompt() {
  const overviewText = await readRequiredTextFile(
    SMART_KITCHEN_PROMPT_OVERVIEW_PATH,
    "smart-kitchen prompt overview"
  );
  const ruleTexts = await Promise.all(
    SMART_KITCHEN_RULE_FILES.map(async (fileName) => ({
      fileName,
      text: await readRequiredTextFile(
        path.join(SMART_KITCHEN_PROMPT_DIR, fileName),
        `smart-kitchen rule file ${fileName}`
      ),
    }))
  );

  return [
    overviewText.trim(),
    ...ruleTexts.map(
      ({ fileName, text }) => `Reference file: ${fileName}\n\n${text.trim()}`
    ),
  ].join("\n\n---\n\n");
}
