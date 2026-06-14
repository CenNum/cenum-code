import { z } from "zod";
import { readdirSync, statSync } from "fs";
import { resolve, relative } from "path";
import { BaseTool } from "./base.js";

export class ListTool extends BaseTool {
  name = "list_files";
  description = "列出目录文件";
  input_schema = z.object({
    path: z.string().optional().describe("目录路径，默认当前目录"),
    max_results: z.number().optional().describe("最大结果数，默认 200"),
  });

  async execute(args: Record<string, unknown>) {
    const dir = resolve(args.path as string || ".");
    const max = (args.max_results as number) || 200;

    const items = readdirSync(dir).slice(0, max).map(name => {
      const p = resolve(dir, name);
      const s = statSync(p);
      const type = s.isDirectory() ? "/" : "";
      const size = s.isFile() ? ` (${formatSize(s.size)})` : "";
      return `  ${name}${type}${size}`;
    });

    return this.ok(`${dir}/\n\`\`\`\n${items.join("\n")}\n\`\`\``);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
