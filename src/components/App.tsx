import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box, Text } from "ink";
import { Chat } from "./Chat.js";
import { Input } from "./Input.js";
import { runQueryLoop } from "../engine/index.js";
import type { UserConfirmFn } from "../engine/index.js";
import { loadConfig } from "../config.js";
import { createSession, addMessage, replaceMessages } from "../hooks/useSession.js";
import type { Message, CenumConfig } from "../types/index.js";

interface Props {
  initialPrompt?: string;
  config?: CenumConfig;
}

export const App: React.FC<Props> = ({ initialPrompt, config: _config }) => {
  const cfg = loadConfig();
  const sessionRef = useRef(createSession());
  const [messages, setMessages] = useState<Message[]>(() => {
    const sysMsg: Message = {
      role: "system",
      content: `你是 Cenum Code——智能终端 AI 编程助手。当前目录: ${cfg.workingDir || process.cwd()}。模型: ${cfg.model}。用 Markdown 格式回复。`,
    };
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
  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);

  // 创建 Ink 组件内的确认函数（替代 readline）
  const inkConfirmFn = useCallback<UserConfirmFn>((question: string) => {
    return new Promise<boolean>(resolve => {
      confirmResolveRef.current = resolve;
      setConfirmQuestion(question);
      setConfirming(true);
    });
  }, []);

  const resolveConfirm = useCallback((approved: boolean) => {
    setConfirming(false);
    setConfirmQuestion("");
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    if (resolve) resolve(approved);
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    // 如果正在确认中，处理 y/n
    if (confirming) {
      const lower = text.trim().toLowerCase();
      if (lower === "y" || lower === "yes") resolveConfirm(true);
      else if (lower === "n" || lower === "no") resolveConfirm(false);
      else resolveConfirm(false); // 非 y/n 默认拒绝
      return;
    }

    if (processingRef.current) return;
    processingRef.current = true;
    setDisabled(true);
    setIsThinking(true);
    setErrorMsg(undefined);
    setStreamingText("");
    setToolCalls([]);

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
          tcList.push(tc);
          setToolCalls([...tcList]);
        },
        (finalMessages) => {
          replaceMessages(sessionRef.current.id, finalMessages);
          setMessages([...finalMessages]);
          setStreamingText("");
          setIsThinking(false);
          setToolCalls([]);
          setDisabled(false);
          processingRef.current = false;
        },
        (err) => {
          setErrorMsg(err);
          setIsThinking(false);
          setStreamingText("");
          setDisabled(false);
          processingRef.current = false;
        },
        inkConfirmFn,
        controller.signal,
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setErrorMsg(err.message || String(err));
      }
      setIsThinking(false);
      setStreamingText("");
      setDisabled(false);
      processingRef.current = false;
    }
  }, [confirming, resolveConfirm, inkConfirmFn]);

  if (initialPrompt) {
    handleSubmit(initialPrompt);
    return (
      <Box flexDirection="column" padding={1}>
        <Chat messages={messages} toolCalls={toolCalls} isThinking={isThinking} streamingText={streamingText} errorMsg={errorMsg} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} height="100%">
      <Box flexDirection="column" flexGrow={1}>
        {messages.length === 1 && messages[0].role === "system" ? (
          <Box flexDirection="column" marginY={1}>
            <Text bold color="green">{"  Cenum Code v0.2"}</Text>
            <Text dimColor>  {"智能终端 AI 编程助手"}</Text>
            <Text>{""}</Text>
            <Text dimColor>{`  模型: ${cfg.model}`}</Text>
            {cfg.baseURL && <Text dimColor>{`  端点: ${cfg.baseURL}`}</Text>}
            <Text>{""}</Text>
            <Text>  {"输入问题开始对话，Ctrl+C 退出"}</Text>
          </Box>
        ) : (
          <Chat messages={messages} toolCalls={toolCalls} isThinking={isThinking} streamingText={streamingText} errorMsg={errorMsg} />
        )}

        {/* 确认提示 */}
        {confirming && (
          <Box marginY={1}>
            <Text color="yellow" bold>{confirmQuestion} </Text>
            <Text dimColor>(y/n)</Text>
          </Box>
        )}
      </Box>

      {/* 底部状态栏 */}
      <Box justifyContent="flex-end">
        <Text dimColor>{cfg.model}</Text>
      </Box>

      <Input
        onSubmit={handleSubmit}
        disabled={disabled && !confirming}
        placeholder={confirming ? "输入 y 或 n" : "输入问题，回车发送"}
      />
    </Box>
  );
};
