import type { Message, ToolCall } from "../types/index.js";
import { loadConfig } from "../config.js";

export interface StreamResult {
  content: string;
  toolCalls: ToolCall[];
}

export async function streamChat(
  messages: Message[],
  tools: any[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamResult> {
  const config = loadConfig();
  const apiKey = config.apiKey!;
  const baseURL = config.baseURL || "https://api.openai.com/v1";

  // 使用 OpenAI SDK，原生处理流式响应和 tool_calls
  let OpenAI: any;
  try { OpenAI = (await import("openai")).default; } catch { OpenAI = (await import("openai")); }

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 0 });

  const apiMessages = messages.map(m => ({
    role: m.role,
    content: m.content ?? "",
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
  }));

  const apiTools = tools.length > 0 ? tools.map((t: any) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema?._def?.shape ? zodToOpenAISchema(t.input_schema) : { type: "object", properties: {} },
    },
  })) : undefined;

  const stream = await client.chat.completions.create({
    model: config.model!,
    max_tokens: config.maxTokens!,
    messages: apiMessages,
    tools: apiTools,
    stream: true,
  }, { signal });

  let content = "";
  const toolCalls: ToolCall[] = [];

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      onToken(delta.content);
      content += delta.content;
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: tc.id || "", function: { name: "", arguments: "" } };
        }
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
      }
    }
  }

  if (!content && toolCalls.length === 0 && !signal?.aborted) {
    throw new Error("API 返回空响应");
  }

  return { content, toolCalls };
}

function zodToOpenAISchema(schema: any): any {
  if (!schema?.shape) return { type: "object", properties: {} };
  const props: any = {};
  const typeMap: Record<string, string> = { ZodString: "string", ZodNumber: "number", ZodBoolean: "boolean" };
  for (const [k, v] of Object.entries(schema.shape) as any) {
    const zt = (v as any)._def?.typeName || "ZodString";
    props[k] = { type: typeMap[zt] || "string", description: (v as any)._def?.description || "" };
  }
  return { type: "object", properties: props, required: Object.keys(props) };
}
