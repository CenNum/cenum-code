import React, { useState, useCallback, useRef, useEffect } from "react";
import { Text, Box, useInput, useStdin } from "ink";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const Input: React.FC<Props> = ({ onSubmit, disabled, placeholder = "输入问题，回车发送" }) => {
  const [value, setValue] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { stdin, setRawMode } = useStdin();
  const cursorRef = useRef<ReturnType<typeof setInterval>>();
  const active = !disabled && !!stdin;

  // 光标闪烁
  useEffect(() => {
    if (!active) return;
    if (cursorRef.current) clearInterval(cursorRef.current);
    cursorRef.current = setInterval(() => setShowCursor(c => !c), 530);
    return () => { if (cursorRef.current) clearInterval(cursorRef.current); };
  }, [active]);

  // raw mode
  useEffect(() => {
    if (!active || !setRawMode) return;
    setRawMode(true);
    return () => { if (setRawMode) setRawMode(false); };
  }, [active, setRawMode]);

  const handleInput = useCallback((data: string | null) => {
    if (!data || !active || disabled) return;

    for (const ch of data) {
      const code = ch.charCodeAt(0);

      if (code === 13) { // Enter
        const trimmed = value.trim();
        if (trimmed) {
          setHistory(prev => [...prev, trimmed]);
          setHistoryIndex(-1);
          onSubmit(trimmed);
        }
        setValue("");
        return;
      }

      if (code === 127 || code === 8) { // Backspace
        setValue(v => v.slice(0, -1));
        continue;
      }

      if (code === 4) { // Ctrl+D
        if (value.length === 0) process.exit(0);
        continue;
      }

      if (code === 3) { // Ctrl+C
        process.exit(0);
      }

      if (code === 27) { // ESC
        if (data.length === 3 && data[1] === "[") {
          const dir = data[2];
          if (dir === "A") { // Up
            if (history.length > 0) {
              const newIdx = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
              setHistoryIndex(newIdx);
              setValue(history[history.length - 1 - newIdx] || "");
            }
          } else if (dir === "B") { // Down
            if (historyIndex > 0) {
              const newIdx = historyIndex - 1;
              setHistoryIndex(newIdx);
              setValue(history[newIdx] || "");
            } else {
              setHistoryIndex(-1);
              setValue("");
            }
          }
        }
        continue;
      }

      // 可打印字符
      if (ch.length === 1 && code >= 32) {
        setValue(v => v + ch);
        setShowCursor(true);
      }
    }
  }, [value, active, disabled, history, historyIndex, onSubmit]);

  useEffect(() => {
    if (!stdin || !active) return;
    stdin.on("data", handleInput);
    return () => { stdin.off("data", handleInput); };
  }, [stdin, handleInput, active]);

  if (!active) return null;

  const cursor = showCursor ? "▌" : " ";

  return (
    <Box marginTop={1}>
      <Text color="cyan" bold>{"> "}</Text>
      <Text color="white">{value}</Text>
      <Text color="white">{cursor}</Text>
      {value.length === 0 ? (
        <Text color="gray" dimColor>  {placeholder}</Text>
      ) : null}
    </Box>
  );
};
