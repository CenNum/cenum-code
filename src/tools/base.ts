import type { ToolDefinition, ToolResult } from "../types/index.js";

export abstract class BaseTool implements ToolDefinition {
  abstract name: string;
  abstract description: string;
  abstract input_schema: any;
  needsApproval = false;

  abstract execute(args: Record<string, unknown>): Promise<ToolResult>;

  protected ok(content: string, diff?: string): ToolResult {
    return { content, diff };
  }

  protected fail(content: string): ToolResult {
    return { content, isError: true };
  }
}
