import { createInterface } from "readline";
import type { CenumConfig, Message } from "../types/index.js";
import { loadConfig } from "../config.js";
import { getAllTools } from "../tools/index.js";
import { streamChat } from "./api.js";

export type UserConfirmFn = (question: string) => Promise<boolean>;

export async function runQueryLoop(
  messages: Message[],
  onToken: (token: string) => void,
  onToolCall: (tool: { name: string; args: string; status: string; description: string; result?: string; diff?: string }) => void,
  onComplete: (finalMessages: Message[]) => void,
  onError: (err: string) => void,
  confirmFn: UserConfirmFn,
  signal?: AbortSignal,
  maxIter = 10,
): Promise<void> {
  const allTools = getAllTools();
  const config: CenumConfig = loadConfig();
  const askWrite = config.askBeforeWrite ?? true;
  const askBash = config.askBeforeBash ?? true;

  for (let iter = 0; iter < maxIter; iter++) {
    if (signal?.aborted) break;

    try {
      const result = await streamChat(
        messages,
        allTools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
        t => onToken(t),
        signal,
      );

      if (result.toolCalls.length > 0) {
        for (const tc of result.toolCalls) {
          if (!tc.function.name) continue;

          const name = tc.function.name;
          const args = safeJsonParse(tc.function.arguments) || {};
          const tool = allTools.find(t => t.name === name);
          if (!tool) {
            onToolCall({ name, args: formatArgs(args), status: "error", description: `未知工具: ${name}` });
            continue;
          }

          const descRunning = buildDesc(name, args, false);
          const descDone = buildDesc(name, args, true);

          // 权限确认
          const needsApprove =
            (name === "bash" && askBash) ||
            ((name === "write_file" || name === "edit_file") && askWrite);

          if (needsApprove && tool.needsApproval) {
            const confirmMsg = buildConfirmMsg(name, args);
            onToolCall({ name, args: formatArgs(args), status: "pending", description: confirmMsg });
            const approved = await confirmFn(confirmMsg);
            if (!approved) {
              onToolCall({ name, args: formatArgs(args), status: "cancelled", description: `${name} 已取消` });
              messages.push({ role: "assistant", content: result.content || "", tool_calls: [tc] });
              messages.push({ role: "tool", content: "用户取消了操作", tool_call_id: tc.id });
              onComplete(messages);
              return;
            }
          }

          // 执行工具
          onToolCall({ name, args: formatArgs(args), status: "running", description: descRunning });
          let toolResult: { content: string; isError?: boolean; diff?: string };
          try {
            toolResult = await tool.execute(args);
          } catch (execErr: any) {
            toolResult = { content: `工具执行异常: ${execErr.message}`, isError: true };
          }

          if (toolResult.isError) {
            onToolCall({ name, args: formatArgs(args), status: "error", description: descDone, result: toolResult.content });
          } else {
            onToolCall({
              name,
              args: formatArgs(args),
              status: "done",
              description: descDone,
              result: toolResult.content,
              diff: toolResult.diff,
            });
          }

          messages.push({
            role: "assistant",
            content: result.content || "",
            tool_calls: [tc],
          });
          messages.push({ role: "tool", content: toolResult.content, tool_call_id: tc.id });

          if (toolResult.isError) {
            messages.push({ role: "user", content: `工具 ${name} 执行失败: ${toolResult.content.split("\n")[0]}` });
          }
        }
        continue;
      }

      if (result.content) {
        messages.push({ role: "assistant", content: result.content });
        onComplete(messages);
        return;
      }

      onError("LLM 未返回任何内容");
      return;

    } catch (err: any) {
      onError(err.message || "未知错误");
      return;
    }
  }

  onComplete(messages);
}

function buildDesc(name: string, args: Record<string, unknown>, done: boolean): string {
  const suffix = done ? " 完成" : "";
  switch (name) {
    case "read_file":
      return `读取 ${shortPath(args.file_path as string)}${suffix}`;
    case "write_file":
      return `写入 ${shortPath(args.file_path as string)}${suffix}`;
    case "edit_file":
      return `编辑 ${shortPath(args.file_path as string)}${suffix}`;
    case "bash": {
      const cmd = (args.command as string || "").slice(0, 80);
      return `bash: ${cmd}${suffix}`;
    }
    case "list_files":
      return `列出 ${shortPath(args.path as string || ".")}${suffix}`;
    case "grep":
      return `搜索 "${args.pattern}"${suffix}`;
    case "glob":
      return `查找 ${args.pattern}${suffix}`;
    case "use_skill":
      return `加载技能 ${args.skill_name}${suffix}`;
    default:
      return `${name}${suffix}`;
  }
}

function buildConfirmMsg(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "bash": {
      const cmd = (args.command as string || "").replace(/\n/g, " ").slice(0, 80);
      return `确认执行命令? ${cmd}${(args.command as string)?.length > 80 ? "..." : ""}`;
    }
    case "write_file":
      return `确认写入文件? ${shortPath(args.file_path as string)}`;
    case "edit_file":
      return `确认编辑文件? ${shortPath(args.file_path as string)}`;
    default:
      return `确认执行 ${name}? (y/n)`;
  }
}

function shortPath(p: string | undefined): string {
  if (!p) return "?";
  const home = process.env.HOME || "/Users";
  return p.replace(home, "~").slice(-50);
}

function formatArgs(args: Record<string, unknown>): string {
  const cmd = args.command as string;
  if (cmd) return cmd.slice(0, 100);
  const fp = args.file_path as string;
  if (fp) return shortPath(fp);
  return JSON.stringify(args).slice(0, 100);
}

function safeJsonParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

export function createDefaultConfirmFn(): UserConfirmFn {
  return async (question: string): Promise<boolean> => {
    return new Promise(resolve => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question + " ", answer => {
        rl.close();
        resolve(answer.toLowerCase().startsWith("y"));
      });
    });
  };
}
