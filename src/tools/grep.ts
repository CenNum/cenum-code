import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { BaseTool } from "./base.js";

export class GrepTool extends BaseTool {
  name = "grep";
  description = "按正则搜索文件内容";
  input_schema = z.object({
    pattern: z.string().describe("正则表达式"),
    path: z.string().optional().describe("搜索路径，默认当前目录"),
    include: z.string().optional().describe("文件通配，如 *.ts"),
    max_results: z.number().optional().describe("最大结果数，默认 50"),
  });

  async execute(args: Record<string, unknown>) {
    const pattern = args.pattern as string;
    const dir = resolve(args.path as string || ".");
    const include = (args.include as string) || "*";
    const max = (args.max_results as number) || 50;

    const regex = new RegExp(pattern, "g");
    const results: string[] = [];
    const { globSync } = await import("bun");

    const files = globSync(`${dir}/**/${include}`).filter((f: string) => {
      try { readFileSync(f); return true; } catch { return false; }
    });

    for (const f of files) {
      if (results.length >= max) break;
      const lines = readFileSync(f, "utf-8").split("\n");
      for (let i = 0; i < lines.length && results.length < max; i++) {
        if (regex.test(lines[i])) {
          results.push(`${f}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
          regex.lastIndex = 0;
        }
      }
    }

    if (results.length === 0) return this.ok("未找到匹配结果");
    return this.ok(`共 ${results.length} 条结果:\n\`\`\`\n${results.join("\n")}\n\`\`\``);
  }
}
