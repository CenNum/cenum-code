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

### 编译环境依赖

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.0 | JavaScript/TypeScript 运行时 + 包管理器 + 打包器 |
| Git | ≥ 2.0 | 克隆仓库 |
| macOS / Linux / WSL2 | — | 支持任意 Unix-like 系统 |

当前项目仅需 Bun，无需额外安装 Node.js、npm 或系统级编译工具链。

#### 安装 Bun

**macOS / Linux：**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows（WSL2）：**

在 WSL2 终端中执行同上命令。

安装后重启终端，验证：

```bash
bun --version   # 应输出 ≥ 1.0
```

### 克隆仓库

```bash
git clone https://github.com/your-org/cenum-code.git
cd cenum-code
```

### 安装依赖

```bash
bun install
```

此命令读取 `package.json` 和 `bun.lock`，自动安装所有依赖到 `node_modules/`。核心依赖包括 `ink`、`react`、`commander`、`zod`、`diff` 等。

### 编译构建

```bash
bun run build
```

等价于 `bun build src/main.tsx --outdir dist --target bun`。Bun 原生打包，将 TypeScript 源码编译为单个 `dist/main.js`，无需额外配置 webpack/esbuild。构建产物约 2.3 MB（含 664 个模块）。

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

## 开发者指南

### 项目初始化

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/cenum-code.git
cd cenum-code

# 2. 安装依赖（Bun）
bun install

# 3. 构建
bun run build
```

### 常用命令

| 命令 | 说明 |
|---|---|
| `bun run dev` | 开发模式，源码热重载运行 |
| `bun run build` | 编译构建，输出 `dist/main.js` |
| `bun run start` | 运行构建产物 |
| `bun run dist/main.js` | 直接运行（等同于 `bun run start`） |
| `bun run dist/main.js -p "问题"` | 非交互单次执行 |
| `bun run dist/main.js --setup` | 重新配置 API Key |

### 开发模式详解

```bash
bun run dev
```

等价于 `bun run --hot src/main.tsx`。Bun 的 `--hot` 标志启用热重载：修改 `src/` 下任意 `.ts` / `.tsx` 文件后自动重启进程，无需手动重新构建。适合快速迭代调试。

### 构建产物

构建产物为单个自包含的 `dist/main.js`（约 2.3 MB），由 Bun 原生打包器生成，包含了所有 TS 源码和第三方依赖。可在安装了 Bun 的任意机器上直接运行，无需 `node_modules/`。

```bash
# 直接把 dist/main.js 复制到目标机器即可运行
bun dist/main.js
```

### 项目架构

```
用户输入 → main.tsx (CLI 入口)
              ↓
         App.tsx (React/Ink 主组件)
              ↓
         engine/index.ts (agent 循环)
              ↓
         engine/api.ts (LLM API 流式调用)
              ↓
         tools/ (工具执行层)
              ↓
         Chat.tsx / MarkdownView.tsx (TUI 渲染)
```

**执行流程**：用户输入 → App 组件调用 `runQueryLoop` → 向 LLM 发起流式请求 → LLM 可能返回文本或工具调用 → 文本直接渲染，工具调用经权限确认后由对应工具模块执行 → 结果反馈给 LLM → 循环直到 LLM 返回纯文本。

### 添加新工具

在 `src/tools/` 下创建新文件，继承 `BaseTool`：

```typescript
// src/tools/http.ts
import { z } from "zod";
import { BaseTool } from "./base.js";

export class HttpTool extends BaseTool {
  name = "http_request";
  description = "发起 HTTP 请求";
  input_schema = z.object({
    url: z.string(),
    method: z.enum(["GET", "POST"]),
  });
  needsApproval = false;  // 是否需用户确认

  async execute(args: Record<string, unknown>) {
    const res = await fetch(args.url as string, { method: args.method as string });
    const body = await res.text();
    return this.ok(body.slice(0, 2000));
  }
}
```

然后在 `src/tools/index.ts` 中注册：

```typescript
import { HttpTool } from "./http.js";
// ...
const allTools = [new ReadTool(), ..., new HttpTool()];
```

### TypeScript 配置

`tsconfig.json` 配置要点：

- `target: "ESNext"` — 输出最新 ES 标准
- `module: "ESNext"` — 使用 ESM 模块
- `moduleResolution: "bundler"` — 适配 Bun 打包器
- `jsx: "react-jsx"` — React 17+ 自动 JSX 转换
- `strict: true` — 启用全部严格类型检查
