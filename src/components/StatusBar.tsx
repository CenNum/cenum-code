import React, { useState, useEffect, useRef } from "react";
import { Text, Box } from "ink";

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export type AgentStatus = "idle" | "thinking" | "executing" | "confirming";

const statusLabels: Record<AgentStatus, string> = {
  idle: "就绪",
  thinking: "思考中",
  executing: "执行中",
  confirming: "等待确认",
};

const statusColors: Record<AgentStatus, string> = {
  idle: "gray",
  thinking: "yellow",
  executing: "cyan",
  confirming: "magenta",
};

interface Props {
  status: AgentStatus;
}

export const StatusBar: React.FC<Props> = ({ status }) => {
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (status === "idle") {
      setTick(0);
      return;
    }
    // 使用 setInterval 强制每帧更新 tick，驱动重渲染
    const id = setInterval(() => {
      if (mountedRef.current) setTick(t => t + 1);
    }, 80);
    return () => clearInterval(id);
  }, [status]);

  const isActive = status !== "idle";
  const frame = isActive ? spinnerFrames[tick % spinnerFrames.length] : "";
  const color = statusColors[status];
  const label = statusLabels[status];

  return (
    <Box height={1} flexShrink={0}>
      {isActive ? (
        <Text color={color}>{frame} {label}</Text>
      ) : (
        <Text color="gray" dimColor>  {label}</Text>
      )}
    </Box>
  );
};
