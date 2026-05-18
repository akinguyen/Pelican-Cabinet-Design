export type OpenAIResponsesOutputMessage = {
  type?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export type OpenAIResponsesPayload = {
  output?: OpenAIResponsesOutputMessage[];
};

export function getResponseText(payload: OpenAIResponsesPayload) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;

    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "output_text" && contentItem.text) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function stripMarkdownCodeFence(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function extractBalancedJsonSnippet(value: string) {
  const source = stripMarkdownCodeFence(value);
  const startIndex = source.search(/[\{\[]/);

  if (startIndex < 0) return null;

  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.at(-1) !== expected) return null;
      stack.pop();

      if (stack.length === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

export function parsePlannerJson(value: string) {
  const directValue = stripMarkdownCodeFence(value);

  try {
    return JSON.parse(directValue);
  } catch {
    const trimmed = directValue.trim();

    if (/^"outputShape"\s*:/.test(trimmed)) {
      try {
        return JSON.parse(`{${trimmed}}`);
      } catch {
        // Fall through to balanced-snippet recovery below.
      }
    }

    const extracted = extractBalancedJsonSnippet(directValue);
    if (!extracted) throw new Error("No balanced JSON object found in planner output.");
    return JSON.parse(extracted);
  }
}
