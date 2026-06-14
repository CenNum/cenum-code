import { z } from "zod";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { createTwoFilesPatch } from "diff";
import { BaseTool } from "./base.js";

export class WriteTool extends BaseTool {
  name = "write_file";
  description = "写入/覆盖文件。自动创建父目录。返回统一 diff。";
  input_schema = z.object({
    file_path: z.string().describe("文件路径"),
    content: z.string().describe("文件内容"),
  });
  needsApproval = true;

  async execute(args: Record<string, unknown>) {
    const fp = resolve(args.file_path as string);
    const newContent = args.content as string;
    const existed = existsSync(fp);
    const oldContent = existed ? readFileSync(fp, "utf-8") : "";

    const dir = dirname(fp);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    writeFileSync(fp, newContent, "utf-8");

    const diff = existed
      ? createTwoFilesPatch(fp, fp, oldContent, newContent, "before", "after")
      : createTwoFilesPatch("/dev/null", fp, "", newContent, "", "");

    const diffPreview = truncateDiff(diff, 40);
    return this.ok(
      existed
        ? `已修改: \`${fp}\`\n\`\`\`diff\n${diffPreview}\n\`\`\``
        : `已创建: \`${fp}\` (${newContent.length} 字符)`,
      diff
    );
  }
}

function truncateDiff(diff: string, maxLines: number): string {
  const lines = diff.split("\n");
  if (lines.length <= maxLines) return diff;
  return lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} 行省略)`;
}
