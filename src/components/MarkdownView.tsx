import React from "react";
import { Text } from "ink";

interface Props {
  text: string;
  role?: "user" | "assistant" | "system" | "tool";
}

export const MarkdownView: React.FC<Props> = ({ text, role }) => {
  const segments = parseMarkdownToSegments(text);
  const color = role === "user" ? "cyan" : role === "system" ? "yellow" : role === "tool" ? "gray" : "green";

  return (
    <Text>
      {segments.map((seg, i) => {
        if (seg.type === "bold") {
          return <Text key={i} bold>{seg.text}</Text>;
        }
        if (seg.type === "code_inline") {
          return <Text key={i} color="cyan">{seg.text}</Text>;
        }
        if (seg.type === "code_block") {
          return <Text key={i} color="gray" dimColor>{seg.text}</Text>;
        }
        if (seg.type === "heading") {
          return <Text key={i} bold color="green">{seg.text}</Text>;
        }
        if (seg.type === "list_item") {
          return <Text key={i}>  • {seg.text}</Text>;
        }
        if (seg.type === "hr") {
          return <Text key={i} dimColor>{"─".repeat(40)}{"\n"}</Text>;
        }
        if (seg.type === "blank") {
          return <Text key={i}>{"\n"}</Text>;
        }
        return <Text key={i} color={color}>{seg.text}</Text>;
      })}
    </Text>
  );
};

interface Segment {
  type: "text" | "bold" | "code_inline" | "code_block" | "heading" | "list_item" | "hr" | "blank";
  text: string;
}

function parseMarkdownToSegments(md: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;

  while (i < md.length) {
    // 代码块
    if (md.startsWith("```", i)) {
      const end = md.indexOf("```", i + 3);
      if (end !== -1) {
        const code = md.slice(i + 3, end).trim();
        const langEnd = code.indexOf("\n");
        const lang = langEnd > 0 ? code.slice(0, langEnd) : "";
        const body = langEnd > 0 ? code.slice(langEnd + 1) : code;
        segs.push({ type: "code_block", text: `${lang ? lang + "\n" : ""}${body}` });
        i = end + 3;
        continue;
      }
    }

    // 标题
    if (md[i] === "#" && (i === 0 || md[i - 1] === "\n")) {
      const end = md.indexOf("\n", i);
      const line = md.slice(i, end === -1 ? md.length : end);
      segs.push({ type: "heading", text: line.replace(/^#+\s*/, "") + "\n" });
      i = end === -1 ? md.length : end;
      continue;
    }

    // 列表项
    if ((md[i] === "-" || md[i] === "*") && (i === 0 || md[i - 1] === "\n") && md[i + 1] === " ") {
      const end = md.indexOf("\n", i);
      const line = md.slice(i + 2, end === -1 ? md.length : end);
      segs.push({ type: "list_item", text: line + "\n" });
      i = end === -1 ? md.length : end;
      continue;
    }

    // 水平线
    if (md.startsWith("---", i) && (i === 0 || md[i - 1] === "\n")) {
      segs.push({ type: "hr", text: "" });
      i += 3;
      continue;
    }

    // 粗体
    if (md.startsWith("**", i)) {
      const end = md.indexOf("**", i + 2);
      if (end !== -1) {
        segs.push({ type: "bold", text: md.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // 行内代码
    if (md[i] === "`" && md[i + 1] !== "`") {
      const end = md.indexOf("`", i + 1);
      if (end !== -1) {
        segs.push({ type: "code_inline", text: md.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // 普通文本（取到换行或特殊字符）
    const end = md.indexOf("\n", i);
    const chunk = md.slice(i, end === -1 ? md.length : end + 1);
    segs.push({ type: "text", text: chunk });
    i = end === -1 ? md.length : end + 1;
  }

  return segs;
}
