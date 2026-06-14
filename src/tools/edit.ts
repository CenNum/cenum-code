import { z } from "zod";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createTwoFilesPatch } from "diff";
import { BaseTool } from "./base.js";

export class EditTool extends BaseTool {
  name = "edit_file";
  description = "精确替换文件中的文本。old_str 必须唯一匹配。";
  input_schema = z.object({
    file_path: z.string().describe("文件路径"),
    old_str: z.string().describe("待替换原文（必须唯一匹配）"),
    new_str: z.string().describe("替换为"),
  });
  needsApproval = true;

  async execute(args: Record<string, unknown>) {
    const fp = resolve(args.file_path as string);
    const oldStr = args.old_str as string;
    const newStr = args.new_str as string;

    const oldContent = readFileSync(fp, "utf-8");
    const count = oldContent.split(oldStr).length - 1;
    if (count === 0) return this.fail(`未找到匹配文本。请确保 old_str 与文件内容完全一致。`);
    if (count > 1) return this.fail(`找到 ${count} 处匹配，请提供更精确的 old_str。`);

    const newContent = oldContent.replace(oldStr, newStr);
    writeFileSync(fp, newContent, "utf-8");

    const diff = createTwoFilesPatch(fp, fp, oldContent, newContent, "before", "after");
    const preview = diff.split("\n").slice(0, 30).join("\n");
    return this.ok(`编辑成功: \`${fp}\`\n\`\`\`diff\n${preview}\n\`\`\``, diff);
  }
}
