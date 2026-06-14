import { z } from "zod";

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: z.ZodTypeAny;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
  needsApproval?: boolean;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  diff?: string;       // git diff 格式的变更
}

export interface CenumConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  permissionMode?: "default" | "auto" | "plan";
  workingDir?: string;
  askBeforeWrite?: boolean;
  askBeforeBash?: boolean;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
}
