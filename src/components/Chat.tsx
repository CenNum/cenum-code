import React from "react";
import { Text, Box } from "ink";
import type { Message } from "../types/index.js";
import { MarkdownView } from "./MarkdownView.js";

export interface ToolCallInfo {
  name: string;
  args: string;
  status: "pending" | "running" | "done" | "error" | "cancelled";
  description: string;
  result?: string;
  diff?: string;
}

interface Props {
  messages: Message[];
  toolCalls: ToolCallInfo[];
  isThinking: boolean;
  streamingText: string;
  errorMsg?: string;
}

const BASELINE_COLORS: Record<string, string> = {
  "---": "cyan",
  "+++": "cyan",
  "@@": "cyan",
};

export const Chat: React.FC<Props> = ({ messages, toolCalls, isThinking, streamingText, errorMsg }) => {
  return (
    <Box flexDirection="column">
      {messages
        .filter(m => m.role === "user" || (m.role === "assistant" && !m.tool_calls?.length))
        .map((msg, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          {msg.role === "user" ? (
            <Text color="cyan" bold>{"> "}</Text>
          ) : null}
          <MarkdownView text={msg.content} role={msg.role} />
        </Box>
      ))}

      {/* 工具调用状态 */}
      {toolCalls.map((tc, i) => (
        <Box key={`tc-${i}`} flexDirection="column" marginBottom={1}>
          {tc.status === "running" || tc.status === "pending" ? (
            <Text color="yellow">  → {tc.description + (tc.status === "running" ? "..." : "")}</Text>
          ) : tc.status === "done" ? (
            <Box flexDirection="column">
              <Text color="green">  ✓ {tc.description}</Text>
              {/* bash 输出用灰色显示 */}
              {tc.name === "bash" && tc.result ? (
                <Box marginLeft={2}>
                  <Text color="gray" dimColor>{tc.result}</Text>
                </Box>
              ) : null}
              {/* diff 用颜色渲染 */}
              {tc.diff ? <DiffView diff={tc.diff} /> : null}
            </Box>
          ) : tc.status === "error" ? (
            <Box flexDirection="column">
              <Text color="red">  ✗ {tc.description}</Text>
              {tc.result ? (
                <Box marginLeft={2}>
                  <Text color="red" dimColor>{tc.result.split("\n")[0]}</Text>
                </Box>
              ) : null}
            </Box>
          ) : tc.status === "cancelled" ? (
            <Text color="gray" dimColor>  — 已取消</Text>
          ) : null}
        </Box>
      ))}

      {/* 流式输出 */}
      {streamingText ? (
        <Box flexDirection="column">
          <MarkdownView text={streamingText} role="assistant" />
        </Box>
      ) : null}

      {isThinking && !streamingText ? (
        <Text color="gray" dimColor>  思考中...</Text>
      ) : null}

      {errorMsg ? (
        <Box marginY={1}>
          <Text color="red" bold>  错误: {errorMsg}</Text>
        </Box>
      ) : null}
    </Box>
  );
};

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  const display = lines.length > 24 ? lines.slice(0, 24) : lines;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {display.map((line, i) => {
        const key = line.slice(0, 3);
        const color = BASELINE_COLORS[key] || (line.startsWith("-") ? "red" : line.startsWith("+") ? "green" : undefined);
        return (
          <Text key={i} color={color} dimColor={!color}>
            {line}
          </Text>
        );
      })}
      {lines.length > 24 && (
        <Text dimColor>... ({lines.length - 24} 行省略)</Text>
      )}
    </Box>
  );
}
