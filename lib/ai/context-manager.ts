/**
 * AI Context Management
 *
 * Manages conversation history to stay within token limits while preserving
 * important context. Uses a "sliding window with summary" approach.
 *
 * Strategy:
 * 1. Keep most recent N messages in full (sliding window)
 * 2. Summarize older messages into a condensed context block
 * 3. Always preserve: system prompt + summary + recent messages + current query
 *
 * Token Limits (approximate):
 * - Most vision models: 8k-32k context window
 * - Screenshots: ~500-1000 tokens each (base64)
 * - Our budget: ~6000 tokens for history (leaves room for images + response)
 * - Rough estimate: 1 token ≈ 4 characters
 *
 * Example with 10 message conversation:
 * ```
 * [System Prompt]
 * [Summary: "Earlier you asked about fruit trees and water management..."]
 * [Message 7: user]
 * [Message 8: assistant]
 * [Message 9: user]
 * [Message 10: assistant]
 * [Current query with images]
 * ```
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Configuration
 */
const CONFIG = {
  // Keep last N message pairs in full detail
  RECENT_MESSAGES_TO_KEEP: 3, // 3 pairs = 6 messages (user + assistant)

  // Estimated token budget for history (excluding system prompt and current message)
  MAX_HISTORY_TOKENS: 6000,

  // Rough token estimation (1 token ≈ 4 characters)
  CHARS_PER_TOKEN: 4,
};

/**
 * Estimate token count for text
 *
 * This is a rough approximation. Real tokenization varies by model.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CONFIG.CHARS_PER_TOKEN);
}

/**
 * Estimate total tokens in message array
 */
function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content);
  }, 0);
}

/**
 * Summarize older messages into a concise context block
 *
 * Creates a bullet-point summary of key topics discussed.
 * This is a simple heuristic - could be improved with AI summarization.
 */
function summarizeOldMessages(messages: Message[]): string {
  if (messages.length === 0) return "";

  // Extract key topics from user questions
  const topics: string[] = [];

  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    if (userMsg.role === "user") {
      // Take first sentence or first 100 chars as topic
      const topic = userMsg.content
        .split(/[.!?]/)[0]
        .substring(0, 100)
        .trim();
      if (topic) topics.push(topic);
    }
  }

  const summary = `**Earlier in this conversation:**
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

The conversation above covered these topics. Let me help you with your current question.`;

  return summary;
}

/**
 * Manage conversation history to fit within token budget
 *
 * @param history - Full conversation history (user/assistant pairs)
 * @returns Optimized history that fits within token limits
 */
export function manageConversationContext(history: Message[]): {
  managedHistory: Message[];
  wasCompressed: boolean;
  stats: {
    originalMessages: number;
    originalTokens: number;
    finalMessages: number;
    finalTokens: number;
  };
} {
  const originalTokens = estimateTotalTokens(history);

  // If we're under budget, return as-is
  if (originalTokens <= CONFIG.MAX_HISTORY_TOKENS) {
    return {
      managedHistory: history,
      wasCompressed: false,
      stats: {
        originalMessages: history.length,
        originalTokens: originalTokens,
        finalMessages: history.length,
        finalTokens: originalTokens,
      },
    };
  }

  // Calculate how many recent messages to keep
  const messagesToKeep = CONFIG.RECENT_MESSAGES_TO_KEEP * 2; // user + assistant pairs

  // Not enough history to compress - just take most recent messages
  if (history.length <= messagesToKeep) {
    return {
      managedHistory: history,
      wasCompressed: false,
      stats: {
        originalMessages: history.length,
        originalTokens: originalTokens,
        finalMessages: history.length,
        finalTokens: originalTokens,
      },
    };
  }

  // Split into old (to summarize) and recent (keep in full)
  const oldMessages = history.slice(0, -messagesToKeep);
  const recentMessages = history.slice(-messagesToKeep);

  // Create summary of old messages
  const summary = summarizeOldMessages(oldMessages);

  // Build compressed history
  // Strategy: Prepend summary to the FIRST user message in recent history
  // This maintains proper alternation and avoids "assistant first" error
  const compressedHistory: Message[] = [...recentMessages];

  // Find the first user message and prepend the summary to it
  const firstUserIndex = compressedHistory.findIndex(m => m.role === "user");
  if (firstUserIndex >= 0) {
    compressedHistory[firstUserIndex] = {
      role: "user",
      content: `[Context from earlier in this conversation]\n\n${summary}\n\n---\n\n${compressedHistory[firstUserIndex].content}`,
    };
  }

  const finalTokens = estimateTotalTokens(compressedHistory);

  return {
    managedHistory: compressedHistory,
    wasCompressed: true,
    stats: {
      originalMessages: history.length,
      originalTokens: originalTokens,
      finalMessages: compressedHistory.length,
      finalTokens: finalTokens,
    },
  };
}

/**
 * Alternative: AI-powered summarization (for future enhancement)
 *
 * This would call a separate LLM to create a high-quality summary
 * of the conversation so far. More accurate but slower and costs tokens.
 */
export async function summarizeWithAI(
  messages: Message[],
  llmClient: any // OpenAI client
): Promise<string> {
  // Build conversation text
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const summaryPrompt = `Summarize this permaculture farm planning conversation in 3-5 bullet points. Focus on key decisions, recommendations, and topics discussed:

${conversationText}

Summary:`;

  const response = await llmClient.chat.completions.create({
    model: "gpt-3.5-turbo", // Fast, cheap model for summarization
    messages: [{ role: "user", content: summaryPrompt }],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || "";
}
