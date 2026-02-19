/**
 * Robust JSON extraction from LLM responses.
 *
 * LLMs often wrap JSON in markdown code fences or add preamble text.
 * This utility handles those cases without silently swallowing errors.
 */

/**
 * Attempt to parse JSON from an LLM response string.
 * Tries, in order:
 *   1. Direct JSON.parse
 *   2. Extract from markdown code fence (```json ... ```)
 *   3. Find the first balanced { ... } block
 *
 * Returns `fallback` if all attempts fail, and logs a warning.
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  // 1. Direct parse
  try {
    return JSON.parse(jsonString);
  } catch {
    // continue
  }

  // 2. Extract from markdown code fence
  const fenceMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // 3. Find first balanced { ... } block
  const startIdx = jsonString.indexOf('{');
  if (startIdx >= 0) {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < jsonString.length; i++) {
      const ch = jsonString[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(jsonString.substring(startIdx, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  console.warn('[safeJsonParse] All parse attempts failed. Input preview:', jsonString.substring(0, 200));
  return fallback;
}
