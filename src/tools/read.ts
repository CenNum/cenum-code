import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { BaseTool } from "./base.js";

export class ReadTool extends BaseTool {
  name = "read_file";
  description = "读取文件内容";
  input_schema = z.object({
    file_path: z.string().describe("文件路径"),
    offset: z.number().optional().describe("起始行 (0-based)"),
    limit: z.number().optional().describe("最大行数，默认 200"),
  });

  async execute(args: Record<string, unknown>) {
    const fp = resolve(args.file_path as string);
    if (!existsSync(fp)) return this.fail(`文件不存在: ${fp}`);

    const offset = (args.offset as number) ?? 0;
    const limit = (args.limit as number) ?? 200;
    const lines = readFileSync(fp, "utf-8").split("\n");
    const slice = lines.slice(offset, offset + limit);
    const lang = fp.split(".").pop() || "";
    return this.ok(
      `\`\`\`${lang}\n${slice.join("\n")}\n\`\`\`\n` +
      `*${fp}  (${offset + 1}-${Math.min(offset + limit, lines.length)} / ${lines.length} 行)*`
    );
  }
}
