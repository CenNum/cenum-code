# Cenum Code

智能终端 AI 编程助手——借鉴 Claude Code 架构，基于 Bun + TypeScript + React/Ink 实现。在终端中与 AI 对话，自动操作文件系统、执行命令、搜索代码。

[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## 特性

- **Markdown 渲染**：回复支持加粗、代码块、标题、列表
- **Git diff 可视化**：文件修改以统一 diff 格式展示，删除行红色、新增行绿色
- **权限确认**：写入文件 / 执行命令前可配置确认，防止误操作
- **实时状态**：工具调用进度实时显示（读取中...、执行完成）
- **流式输出**：回复逐字流式呈现
- **7 个内置工具**：读写文件、搜索代码、执行 Shell 命令

## 安装

### 前置条件

需要 [Bun](https://bun.sh) 运行时（≥1.0）：

```bash
curl -fsSL https://bun.sh/install | bash
```

### 克隆并构建

```bash
git clone https://github.com/your-org/cenum-code.git
cd cenum-code
bun install
bun run build
```

### 链接为全局命令（可选）

```bash
bun link
```

之后在任意目录直接输入 `cenum` 即可启动。

## 配置 API Key

Cenum Code 兼容任何 OpenAI 格式的 API。支持三种配置方式：

### 方式一：交互式配置（推荐）

```bash
cenum --setup
```

依次输入 API Key、Base URL（可留空）、模型名（可留空）。

配置保存在 `~/.cenum-code/config.json`。

### 方式二：环境变量

```bash
export OPENAI_API_KEY="sk-your-key-here"
export OPENAI_BASE_URL="https://api.openai.com/v1"   # 可选
```

### 方式三：直接编辑配置文件

```bash
mkdir -p ~/.cenum-code
```

编辑 `~/.cenum-code/config.json`：

```json
{
  "apiKey": "sk-your-key-here",
  "baseURL": "https://api.openai.com/v1",
  "model": "gpt-4o"
}
```

### 兼容的服务商

| 服务商 | Base URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Ollama（本地） | `http://localhost:11434/v1` |
| vLLM（本地） | `http://localhost:8000/v1` |
| 其他兼容代理 | 按服务商提供 |

> Ollama / vLLM 不校验 Key，随便填即可。

## 使用

### 交互模式

```bash
cenum
```

看到提示符后输入问题，回车发送。支持以下快捷键：

| 按键 | 功能 |
|---|---|
| `Enter` | 发送 |
| `Ctrl+U` | 清空当前行 |
| `Ctrl+W` | 删除前一个词 |
| `Ctrl+C` | 中断当前请求 |
| `Ctrl+D` | 退出程序 |

### 非交互模式

```bash
cenum -p "解释这段代码的作用"
cenum -p "在 src/ 下找到所有 TODO 注释"
cenum --model gpt-4o-mini -p "优化这段 SQL"
```

### 查看配置

```bash
cenum --config
```

## 内置工具

| 工具 | 功能 | 需确认 |
|---|---|---|
| `read_file` | 读取文件内容 | 否 |
| `write_file` | 写入 / 覆盖文件 | 是 |
| `edit_file` | 精确查找替换文本 | 是 |
| `bash` | 执行 Shell 命令 | 是 |
| `grep` | 正则搜索文件内容 | 否 |
| `glob` | 通配符匹配文件名 | 否 |
| `list_files` | 列出目录结构 | 否 |

确认行为可通过配置项 `askBeforeWrite` 和 `askBeforeBash` 控制。

## 技术栈

| 层级 | 技术 |
|---|---|
| 运行时 | Bun |
| 语言 | TypeScript (strict) |
| TUI 框架 | React 19 + Ink 6 |
| CLI 框架 | Commander.js |
| 参数校验 | Zod 4 |
| 代码差异 | diff |
| Markdown 解析 | 自研轻量解析器 |

## 项目结构

```
src/
├── main.tsx          # CLI 入口
├── config.ts         # 配置读写
├── components/
│   ├── App.tsx       # 主应用组件
│   ├── Chat.tsx      # 消息列表 + 工具状态
│   ├── Input.tsx     # 输入框组件
│   └── MarkdownView.tsx  # Markdown 渲染器
├── engine/
│   ├── api.ts        # LLM API 客户端
│   └── index.ts      # agent 循环 + 工具编排
├── tools/
│   ├── index.ts      # 工具注册
│   ├── read.ts       # 读文件
│   ├── write.ts      # 写文件
│   ├── edit.ts       # 精确编辑
│   ├── bash.ts       # Shell 命令
│   ├── grep.ts       # 内容搜索
│   ├── glob.ts       # 文件名搜索
│   └── list.ts       # 目录列表
└── types/
    └── index.ts      # 类型定义
```

## 开发

```bash
# 开发模式（热重载）
bun run dev

# 构建
bun run build

# 运行
bun run start
```
