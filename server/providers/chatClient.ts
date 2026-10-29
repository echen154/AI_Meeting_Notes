import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// One place that decides which LLM handles text cleanup and meeting notes.
// Anthropic is used when its key is set; otherwise Groq (OpenAI-compatible API).

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
const groq =
  !anthropic && GROQ_API_KEY ? new OpenAI({ apiKey: GROQ_API_KEY, baseURL: GROQ_BASE_URL }) : null;

export function isChatAvailable(): boolean {
  return anthropic !== null || groq !== null;
}

interface Request {
  system: string;
  user: string;
  maxTokens?: number;
}

export async function completeText({ system, user, maxTokens = 1024 }: Request): Promise<string> {
  if (anthropic) {
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = message.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
  if (groq) {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  }
  throw new Error("No LLM provider configured.");
}

// Returns a parsed JSON object matching `schema` (a JSON Schema object).
export async function completeJson({
  system,
  user,
  schema,
  maxTokens = 1024,
}: Request & { schema: Record<string, unknown> }): Promise<unknown> {
  if (anthropic) {
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      tools: [
        {
          name: "respond",
          description: "Return the result.",
          input_schema: schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "respond" },
      messages: [{ role: "user", content: user }],
    });
    const toolUse = message.content.find((b) => b.type === "tool_use");
    return toolUse && toolUse.type === "tool_use" ? toolUse.input : null;
  }
  if (groq) {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${system}\n\nRespond with only a JSON object matching this JSON Schema:\n${JSON.stringify(schema)}`,
        },
        { role: "user", content: user },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  }
  throw new Error("No LLM provider configured.");
}
