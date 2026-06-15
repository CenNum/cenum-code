import React, { useState, useRef, useCallback } from "react";
import { Box, Text } from "ink";
import { Chat } from "./Chat.js";
import { Input } from "./Input.js";
import { runQueryLoop } from "../engine/index.js";
import type { UserConfirmFn } from "../engine/index.js";
import { loadConfig } from "../config.js";
import { createSession, addMessage, replaceMessages, clearSession } from "../hooks/useSession.js";
import { getSkillManager } from "../skills/manager.js";
import type { Message, CenumConfig } from "../types/index.js";
import { StatusBar } from "./StatusBar.js";
import type { AgentStatus } from "./StatusBar.js";
import { saveConfig, getConfigPath } from "../config.js";

interface Props {
  initialPrompt?: string;
  config?: CenumConfig;
}

const HELP_TEXT = `## /help — Cenum Code 帮助

**内置斜杠命令**

| 命令 | 说明 |
|------|------|
| \`/skills\` | 管理已安装的技能 (list / install / remove / enable / disable) |
| \`/help\` | 显示此帮助信息 |
| \`/clear\` | 清除当前对话历史 |
| \`/exit\` | 退出程序 |

**快捷键**

| 按键 | 功能 |
|------|------|
| Tab | 补全当前选中的命令 |
| ↑↓ | 在建议列表或历史记录中导航 |
| Enter | 发送输入 |
| Ctrl+C | 退出 |
| Ctrl+D | 输入为空时退出 |

**工具**

Cenum Code 内置 8 个工具：read_file / write_file / edit_file / bash / grep / glob / list_files / use_skill`;

export const App: React.FC<Props> = ({ initialPrompt, config: _config }) => {
  const cfg = loadConfig();
  const skillMgr = getSkillManager();
  const skillsPrompt = skillMgr.getSystemPrompt();

  const sessionRef = useRef(createSession());
  const [messages, setMessages] = useState<Message[]>(() => {
    const sysContent = `你是 Cenum Code——智能终端 AI 编程助手。当前目录: ${cfg.workingDir || process.cwd()}。模型: ${cfg.model}。用 Markdown 格式回复。${skillsPrompt}`;
    const sysMsg: Message = { role: "system", content: sysContent };
    sessionRef.current.messages = [sysMsg];
    return [sysMsg];
  });
  const [streamingText, setStreamingText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [disabled, setDisabled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmQuestion, setConfirmQuestion] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [askBeforeWrite, setAskBeforeWrite] = useState(cfg.askBeforeWrite ?? true);
  const [askBeforeBash, setAskBeforeBash] = useState(cfg.askBeforeBash ?? true);
  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const streamClearedRef = useRef(false);

  const inkConfirmFn = useCallback<UserConfirmFn>((question: string) => {
    return new Promise<boolean>(resolve => {
      confirmResolveRef.current = resolve;
      setConfirmQuestion(question);
      setConfirming(true);
      setStatus("confirming");
    });
  }, []);

  const resolveConfirm = useCallback((approved: boolean) => {
    setConfirming(false);
    setConfirmQuestion("");
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    if (resolve) resolve(approved);
    const thinking = isThinking;
    setStatus(processingRef.current ? (thinking ? "thinking" : "executing") : "idle");
  }, [isThinking]);

  // 统一斜杠命令路由：返回 { sync: 同步结果 } 或 { async: true } 表示需异步处理
  const routeSlashCommand = useCallback((text: string): { sync?: string; async?: string; cmd?: string } => {
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0];

    switch (cmd) {
      case "/help":
        return { sync: HELP_TEXT };

      case "/clear": {
        const newSession = createSession();
        const sysContent = `你是 Cenum Code——智能终端 AI 编程助手。当前目录: ${cfg.workingDir || process.cwd()}。模型: ${cfg.model}。用 Markdown 格式回复。${skillsPrompt}`;
        const sysMsg: Message = { role: "system", content: sysContent };
        newSession.messages = [sysMsg];
        sessionRef.current = newSession;
        setMessages([sysMsg]);
        setStreamingText("");
        setIsThinking(false);
        setToolCalls([]);
        setErrorMsg(undefined);
        return { sync: "对话历史已清除。开始新的对话。" };
      }

      case "/exit":
        process.exit(0);

      case "/setting": {
        const sub = parts[1];
        const val = parts[2];

        if (!sub) {
          return {
            sync: `## 当前设置\n\n| 设置项 | 状态 | 说明 |\n|------|------|------|\n| \`askBeforeWrite\` | ${askBeforeWrite ? "开启" : "关闭"} | 编辑/写入文件前确认 |\n| \`askBeforeBash\` | ${askBeforeBash ? "开启" : "关闭"} | 执行命令前确认 |\n\n修改: \`/setting <项> on|off\``
          };
        }

        if (!val || (val !== "on" && val !== "off")) {
          return { sync: "用法: `/setting <askBeforeWrite|askBeforeBash> on|off`" };
        }

        const enabled = val === "on";

        if (sub === "askBeforeWrite") {
          setAskBeforeWrite(enabled);
          const configPath = getConfigPath();
          return { async: "setting", cmd: `askBeforeWrite|${enabled}|${configPath}` };
        }

        if (sub === "askBeforeBash") {
          setAskBeforeBash(enabled);
          const configPath = getConfigPath();
          return { async: "setting", cmd: `askBeforeBash|${enabled}|${configPath}` };
        }

        return { sync: `未知设置项: ${sub}。可用: askBeforeWrite, askBeforeBash` };
      }

      case "/skills": {
        // /skills 子命令处理
        const sub = parts[1];
        switch (sub) {
          case "list":
          case undefined: {
            const skills = skillMgr.list();
            if (skills.length === 0) return { sync: "当前没有安装任何 skill。\n\n安装方法: `/skills install https://github.com/obra/superpowers`" };
            const lines = skills.map(s =>
              `- **${s.name}** [${s.enabled ? "启用" : "禁用"}] — ${s.description}\n  来源: ${s.source}`
            );
            return { sync: `## 已安装 Skills (${skills.length} 个)\n\n${lines.join("\n")}` };
          }
          case "install": {
            const url = parts[2];
            if (!url) return { sync: "用法: `/skills install <git-url>`\n\n示例: `/skills install https://github.com/obra/superpowers`" };
            return { async: "install", cmd: url };
          }
          case "remove": {
            const name = parts[2];
            if (!name) return { sync: "用法: `/skills remove <skill-name>`" };
            const skill = skillMgr.getByName(name);
            if (!skill) return { sync: `技能 "${name}" 不存在。使用 /skills list 查看已安装技能。` };
            return { async: "remove", cmd: name };
          }
          case "enable": {
            const name = parts[2];
            if (!name) return { sync: "用法: `/skills enable <skill-name>`" };
            if (!skillMgr.setEnabled(name, true)) return { sync: `技能 "${name}" 不存在。` };
            return { sync: `已启用技能 "${name}"。` };
          }
          case "disable": {
            const name = parts[2];
            if (!name) return { sync: "用法: `/skills disable <skill-name>`" };
            if (!skillMgr.setEnabled(name, false)) return { sync: `技能 "${name}" 不存在。` };
            return { sync: `已禁用技能 "${name}"。` };
          }
          default:
            return { sync: `未知子命令: /skills ${sub}\n\n可用命令: list, install <url>, remove <name>, enable <name>, disable <name>` };
        }
      }

      default:
        return {};
    }
  }, [skillMgr, skillsPrompt, cfg, askBeforeWrite, askBeforeBash]);

  const addAssistantMsg = useCallback((content: string, userText: string) => {
    const userMsg: Message = { role: "user", content: userText };
    const respMsg: Message = { role: "assistant", content };
    addMessage(sessionRef.current.id, userMsg);
    addMessage(sessionRef.current.id, respMsg);
    setMessages(prev => {
      // 如果 prev 已包含该 userMsg（由 clear 命令已更新），则不重复添加
      const hasUser = prev.some(m => m.role === "user" && m.content === userText);
      if (hasUser) return [...prev, respMsg];
      return [...prev, userMsg, respMsg];
    });
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    if (confirming) {
      resolveConfirm(text === "y");
      return;
    }

    // 统一斜杠命令路由
    if (text.startsWith("/")) {
      const routed = routeSlashCommand(text);

      // 同步结果直接展示
      if (routed.sync !== undefined) {
        addAssistantMsg(routed.sync, text);
        return;
      }

      // 异步操作
      if (routed.async === "install") {
        const url = routed.cmd!;
        setDisabled(true);
        try {
          const userMsg: Message = { role: "user", content: text };
          setMessages(prev => [...prev, userMsg]);
          const installed = await skillMgr.install(url);
          const names = installed.map(s => s.name).join(", ");
          const respMsg: Message = { role: "assistant", content: `## 安装完成\n\n成功安装 ${installed.length} 个技能: ${names}\n\n使用 /skills list 查看详情。` };
          addMessage(sessionRef.current.id, userMsg);
          addMessage(sessionRef.current.id, respMsg);
          setMessages(prev => [...prev, respMsg]);
        } catch (err: any) {
          setErrorMsg(err.message);
        }
        setDisabled(false);
        return;
      }

      if (routed.async === "remove") {
        const name = routed.cmd!;
        const userMsg: Message = { role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        await skillMgr.remove(name);
        const respMsg: Message = { role: "assistant", content: `已删除技能 "${name}"。` };
        addMessage(sessionRef.current.id, userMsg);
        addMessage(sessionRef.current.id, respMsg);
        setMessages(prev => [...prev, respMsg]);
        return;
      }

      if (routed.async === "setting") {
        const [key, valStr, configPath] = routed.cmd!.split("|");
        const enabled = valStr === "true";
        const label = key === "askBeforeWrite" ? "编辑/写入文件前确认" : "执行命令前确认";
        addAssistantMsg(`${label}已**${enabled ? "开启" : "关闭"}**。`, text);
        // 写入配置文件
        try {
          const content = await Bun.file(configPath).text();
          const cfg = JSON.parse(content);
          cfg[key] = enabled;
          await Bun.write(configPath, JSON.stringify(cfg, null, 2));
        } catch {}
        return;
      }

      // 未知命令 → 交给 LLM
    }

    if (processingRef.current) return;
    processingRef.current = true;
    setDisabled(true);
    setIsThinking(true);
    setStatus("thinking");
    setErrorMsg(undefined);
    setStreamingText("");
    setToolCalls([]);
    streamClearedRef.current = false;

    const userMsg: Message = { role: "user", content: text };
    addMessage(sessionRef.current.id, userMsg);
    setMessages(prev => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    let streamed = "";
    const tcList: any[] = [];

    try {
      const currentMessages = [...sessionRef.current.messages];

      await runQueryLoop(
        currentMessages,
        (token) => {
          streamed += token;
          setStreamingText(streamed);
        },
        (tc) => {
          if (!streamClearedRef.current) {
            streamClearedRef.current = true;
            setStreamingText("");
          }
          tcList.push(tc);
          setToolCalls([...tcList]);
          if (tcList.length === 1) setStatus("executing");
        },
        (finalMessages) => {
          replaceMessages(sessionRef.current.id, finalMessages);
          setMessages([...finalMessages]);
          setStreamingText("");
          setIsThinking(false);
          setToolCalls([]);
          setDisabled(false);
          processingRef.current = false;
          setStatus("idle");
        },
        (err) => {
          setErrorMsg(err);
          setIsThinking(false);
          setStreamingText("");
          setDisabled(false);
          processingRef.current = false;
          setStatus("idle");
        },
        inkConfirmFn,
        controller.signal,
        10,
        askBeforeWrite,
        askBeforeBash,
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setErrorMsg(err.message || String(err));
      }
      setIsThinking(false);
      setStreamingText("");
      setDisabled(false);
      processingRef.current = false;
      setStatus("idle");
    }
  }, [confirming, resolveConfirm, inkConfirmFn, routeSlashCommand, addAssistantMsg, skillMgr, status, askBeforeWrite, askBeforeBash]);

  if (initialPrompt) {
    handleSubmit(initialPrompt);
    return (
      <Box flexDirection="column" padding={1}>
        <StatusBar status={status} />
        <Chat messages={messages} toolCalls={toolCalls} isThinking={isThinking} streamingText={streamingText} errorMsg={errorMsg} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} height="100%">
      <StatusBar status={status} />
      <Box flexDirection="column" flexGrow={1}>
        {messages.length === 1 && messages[0].role === "system" ? (
          <Box flexDirection="column" marginY={1}>
            <Text bold color="green">{"  Cenum Code v0.2"}</Text>
            <Text dimColor>  {"智能终端 AI 编程助手"}</Text>
            <Text>{""}</Text>
            <Text dimColor>{`  模型: ${cfg.model}`}</Text>
            {cfg.baseURL && <Text dimColor>{`  端点: ${cfg.baseURL}`}</Text>}
            <Text dimColor>{`  技能: ${skillMgr.list().filter(s => s.enabled).length} 个`}</Text>
            <Text>{""}</Text>
            <Text>  {"输入 / 查看命令，Enter 发送，Ctrl+C 退出"}</Text>
          </Box>
        ) : (
          <Chat messages={messages} toolCalls={toolCalls} isThinking={isThinking} streamingText={streamingText} errorMsg={errorMsg} />
        )}

        {confirming && (
          <Box marginY={1}>
            <Text color="yellow" bold>{confirmQuestion} </Text>
            <Text dimColor>(y/n)</Text>
          </Box>
        )}
      </Box>

      <Box justifyContent="flex-end">
        <Text dimColor>{cfg.model}</Text>
      </Box>

      <Input
        onSubmit={handleSubmit}
        disabled={disabled && !confirming}
        confirmMode={confirming}
        placeholder={confirming ? "" : "输入 / 查看命令"}
      />
    </Box>
  );
};
