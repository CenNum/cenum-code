import { z } from "zod";
import { execSync } from "child_process";
import { BaseTool } from "./base.js";

export class BashTool extends BaseTool {
  name = "bash";
  description = "执行 Shell 命令并返回结果";
  input_schema = z.object({
    command: z.string().describe("Shell 命令"),
    timeout: z.number().optional().describe("超时秒数，默认 30"),
  });
  needsApproval = true;

  async execute(args: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> {
    const cmd = args.command as string;
    const timeoutMs = ((args.timeout as number) || 30) * 1000;

    try {
      const out = execSync(cmd, {
        encoding: "utf-8",
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });
      return this.ok(`\`\`\`\n$ ${cmd}\n${out.trim() || "(无输出)"}\n\`\`\``);
    } catch (err: any) {
      const msg = err.killed
        ? `命令超时 (${timeoutMs / 1000}s): ${err.message || cmd}`
        : (err.stderr || err.message || "").trim();
      return this.fail(`\`\`\`\n$ ${cmd}\n${msg}\n\`\`\``);
    }
  }
}
