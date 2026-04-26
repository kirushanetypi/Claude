/**
 * Minimal Anthropic API client (non-streaming).
 * Reads API key from ANTHROPIC_API_KEY at call time.
 */

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function callClaude(input: {
  model?: string;
  system?: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY не задан в окружении");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model ?? "claude-haiku-4-5-20251001",
      max_tokens: input.maxTokens ?? 800,
      system: input.system,
      messages: input.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const out = data.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n")
    .trim();
  return out;
}
