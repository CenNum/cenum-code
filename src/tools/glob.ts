import { z } from "zod";
import { resolve } from "path";
import { BaseTool } from "./base.js";

export class GlobTool extends BaseTool {
  name = "glob";
  description = "通配符搜索文件";
  input_schema = z.object({
    pattern: z.string().describe("通配符模式，如 **/*.ts"),
    path: z.string().optional().describe("搜索路径，默认当前目录"),
    max_results: z.number().optional().describe("最大结果数，默认 100"),
  });

  async execute(args: Record<string, unknown>) {
    const pattern = args.pattern as string;
    const dir = resolve(args.path as string || ".");
    const max = (args.max_results as number) || 100;

    const { globSync } = await import("bun");
    const files = globSync(`${dir}/${pattern}`).slice(0, max);

    if (files.length === 0) return this.ok("未找到匹配文件");
    return this.ok(`共找到 ${files.length} 个文件:\n\`\`\`\n${files.join("\n")}\n\`\`\``);
  }
}
