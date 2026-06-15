import React, { useState, useRef, useEffect } from "react";
import { Text, Box, useInput, useStdin } from "ink";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  confirmMode?: boolean;
}

const COMMANDS = [
  { name: "/skills", description: "管理已安装的技能", hint: "list | install <url> | remove <name> | enable/disable <name>" },
  { name: "/help", description: "显示帮助信息", hint: "" },
  { name: "/clear", description: "清除对话历史", hint: "" },
  { name: "/exit", description: "退出程序（建议 Ctrl+C）", hint: "" },
];

export const Input: React.FC<Props> = ({ onSubmit, disabled, placeholder = "输入 / 查看命令", confirmMode }) => {
  const [value, setValue] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const { setRawMode } = useStdin();
  const cursorRef = useRef<ReturnType<typeof setInterval>>();
  const active = !disabled;

  // Refs：所有可变状态通过 ref 访问，保证 useInput 闭包始终最新
  const valueRef = useRef(value);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const suggestionIdxRef = useRef(suggestionIdx);
  const confirmModeRef = useRef(confirmMode);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  useEffect(() => { suggestionIdxRef.current = suggestionIdx; }, [suggestionIdx]);
  useEffect(() => { confirmModeRef.current = confirmMode; }, [confirmMode]);
  useEffect(() => { onSubmitRef.current = onSubmit; });

  // 派生值
  const showSuggestions = !confirmMode && value.startsWith("/");
  const matchingCommands = showSuggestions
    ? COMMANDS.filter(c => c.name.startsWith(value))
    : [];
  const showSuggestionsRef = useRef(showSuggestions);
  const matchingCommandsRef = useRef(matchingCommands);
  useEffect(() => { showSuggestionsRef.current = showSuggestions; }, [showSuggestions]);
  useEffect(() => { matchingCommandsRef.current = matchingCommands; }, [matchingCommands]);

  // value 变化时重置建议索引
  useEffect(() => { setSuggestionIdx(0); }, [value]);

  // 光标闪烁（仅 active 时）
  useEffect(() => {
    if (!active) return;
    if (cursorRef.current) clearInterval(cursorRef.current);
    cursorRef.current = setInterval(() => setShowCursor(c => !c), 530);
    return () => { if (cursorRef.current) clearInterval(cursorRef.current); };
  }, [active]);

  // raw mode（useInput 也会开，但显式确保）
  useEffect(() => {
    if (!setRawMode) return;
    setRawMode(true);
    return () => { setRawMode(false); };
  }, [setRawMode]);

  // ===== 核心：useInput 统一处理所有按键 =====
  useInput((input, key) => {
    if (!active) return;

    const cm = confirmModeRef.current;

    // 确认模式：仅响应 y/n
    if (cm) {
      if (input === "y" || input === "Y") {
        onSubmitRef.current("y");
        setValue("");
        return;
      }
      if (input === "n" || input === "N") {
        onSubmitRef.current("n");
        setValue("");
        return;
      }
      return;
    }

    const ss = showSuggestionsRef.current;
    const mc = matchingCommandsRef.current;
    const si = suggestionIdxRef.current;

    // Enter — 有建议列表时补全，否则提交
    if (key.return) {
      if (ss && mc.length > 0) {
        // 建议可见 → 补全选中命令
        const idx = Math.min(si, mc.length - 1);
        setValue(mc[idx].name + " ");
        setSuggestionIdx(0);
      } else {
        const currentValue = valueRef.current.trim();
        if (currentValue) {
          setHistory(prev => [...prev, currentValue]);
          setHistoryIndex(-1);
          onSubmitRef.current(currentValue);
        }
        setValue("");
        setSuggestionIdx(0);
      }
      return;
    }

    // Tab — 补全选中命令
    if (key.tab) {
      if (ss && mc.length > 0) {
        const idx = Math.min(si, mc.length - 1);
        setValue(mc[idx].name + " ");
        setSuggestionIdx(0);
      }
      return;
    }

    // ↑ 上箭头
    if (key.upArrow) {
      if (ss && mc.length > 0) {
        setSuggestionIdx(si > 0 ? si - 1 : mc.length - 1);
      } else {
        const h = historyRef.current;
        const hi = historyIndexRef.current;
        if (h.length > 0) {
          const newIdx = hi < h.length - 1 ? hi + 1 : hi;
          setHistoryIndex(newIdx);
          setValue(h[h.length - 1 - newIdx] || "");
        }
      }
      return;
    }

    // ↓ 下箭头
    if (key.downArrow) {
      if (ss && mc.length > 0) {
        setSuggestionIdx(si < mc.length - 1 ? si + 1 : 0);
      } else {
        const hi = historyIndexRef.current;
        if (hi > 0) {
          const newIdx = hi - 1;
          setHistoryIndex(newIdx);
          setValue(historyRef.current[newIdx] || "");
        } else {
          setHistoryIndex(-1);
          setValue("");
        }
      }
      return;
    }

    // Backspace / Delete
    if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1));
      return;
    }

    // Ctrl+C → 退出
    if (input === "\x03") {
      process.exit(0);
    }

    // Ctrl+D — 输入为空时退出
    if (input === "\x04") {
      if (valueRef.current.length === 0) process.exit(0);
      return;
    }

    // 可打印字符
    if (input && input.length > 0) {
      const filtered = input.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
      if (filtered.length > 0) {
        setValue(v => v + filtered);
        setShowCursor(true);
      }
    }
  });

  if (!active) return null;

  const cursor = showCursor ? "▌" : " ";

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* 确认模式下不显示输入行（App.tsx 自行渲染确认提示） */}
      {confirmMode ? null : (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="white">{value}</Text>
          <Text color="white">{cursor}</Text>
          {value.length === 0 ? (
            <Text color="gray" dimColor>  {placeholder}</Text>
          ) : null}
        </Box>
      )}

      {/* 命令建议下拉 */}
      {showSuggestions && matchingCommands.length > 0 && (
        <Box flexDirection="column" marginLeft={2} marginTop={0}>
          {matchingCommands.map((cmd, i) => {
            const selected = i === Math.min(suggestionIdx, matchingCommands.length - 1);
            return (
              <Box key={cmd.name}>
                <Text color={selected ? "cyanBright" : "gray"} inverse={selected}>
                  {"  "}{cmd.name}{cmd.hint ? " " + cmd.hint : ""}
                </Text>
                {!selected && (
                  <Text color="gray" dimColor>  {cmd.description}</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
