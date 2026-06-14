# Cenum Code

智能终端 AI 编程助手，基于 Bun + TypeScript + React/Ink 实现。在终端中与 AI 对话，自动操作文件系统、执行命令、搜索代码。

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

### 环境要求

| 依赖 | 验证命令 | 真实版本（已验证） |
|---|---|---|
| Bun | `bun --version` | ≥ 1.0（macOS 26.5 实测通过） |
| Git | `git --version` | ≥ 2.0 |
| 操作系统 | — | macOS 26.5 / Linux / WSL2 |

> 不需要单独安装 Node.js、npm、Xcode Command Line Tools。Bun 内置了包管理器、打包器和运行时，一步到位。

### 依赖版本清单

以下为 `package.json` 中锁定并验证过的版本，直接 `bun install` 即可复现：

**生产依赖：**

| 包名 | 版本 | 用途 |
|---|---|---|
| `ink` | ^6.0.0 | React TUI 渲染框架 |
| `react` | ^19.0.0 | UI 组件 |
| `commander` | ^13.1.0 | CLI 参数解析 |
| `zod` | ^3.24.2 | 工具参数校验 |
| `diff` | ^9.0.0 | Git diff 生成 |
| `chalk` | ^5.4.1 | 终端颜色（早期调试） |
| `strip-ansi` | ^7.1.0 | ANSI 转义码清理 |
| `ink-spinner` | ^5.0.0 | 加载动画（备用） |

**开发依赖：**

| 包名 | 版本 | 用途 |
|---|---|---|
| `@types/diff` | ^8.0.0 | diff 类型声明 |
| `@types/react` | ^19.0.0 | React 类型声明 |
| `bun-types` | latest | Bun 运行时类型 |

### 初始化流程

```bash
# 1. 安装 Bun（如未安装）
curl -fsSL https://bun.sh/install | bash

# 2. 验证 Bun 版本
bun --version   # 预计 > 1.0

# 3. 克隆仓库
git clone https://github.com/your-org/cenum-code.git
cd cenum-code

# 4. 安装依赖（全部锁定版本，约 1-2 秒完成）
bun install

# 5. 构建
bun run build
# 输出: Bundled 664 modules → dist/main.js (约 2.30 MB)
```

安装过程极快——Bun 的二进制安装方式远快于 npm，全量依赖安装通常在 2 秒内完成。

### 常用命令

| 命令 | 说明 |
|---|---|
| `bun run dev` | 开发模式，`--hot` 热重载 |
| `bun run build` | 编译 → `dist/main.js` |
| `bun run start` | 运行构建产物 |
| `bun dist/main.js -p "问题"` | 非交互单次执行 |
| `bun dist/main.js --setup` | 重新配置 API Key |

### 构建原理

项目不使用 `tsc` 进行编译，而是直接通过 Bun 原生打包器 `bun build` 将 TypeScript 源码和所有依赖打包为一个自包含的 `.js` 文件：

```bash
# package.json 中定义的构建命令
bun build src/main.tsx --outdir dist --target bun
```

**关键参数：**

- `--target bun`：目标运行时为 Bun，启用 Bun 原生 API（如 `Bun.file()`、`Bun.write()`）
- `--outdir dist`：输出到 `dist/` 目录
- 入口文件为 `main.tsx`（因为用了 Ink/JSX，必须 `.tsx` 扩展名）

产物 `dist/main.js` 约 2.30 MB，包含 664 个模块。在安装了 Bun 的机器上可直接运行，无需携带 `node_modules/`。

### 踩坑记录

> 以下为开发过程中实际遇到的问题及解决方式，供后续开发者参考。

**1. Bun 全局安装路径问题**

Bun 默认安装到 `~/.bun/bin/`，安装脚本会自动追加到 `~/.bashrc` 或 `~/.zshrc`。如果安装后 `bun` 命令不可用，手动执行：

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

建议将这一行加入 `~/.zshrc`（macOS）或 `~/.bashrc`（Linux）使其永久生效。

**2. 不要混用 Node.js/npm**

Bun 作为替代品完全独立运行。如果环境中同时存在 Node.js，请确保使用 `bun install` 而非 `npm install`，使用 `bun run` 而非 `npx`。Bun 的 `node_modules` 结构与 npm 兼容，但安装速度更快。

**3. 构建入口必须是 `.tsx`**

由于项目使用了 Ink（React TUI），入口文件包含 JSX 语法，必须命名为 `main.tsx` 而非 `main.ts`。Bun 通过扩展名自动识别 JSX 并启用 React 转换。

**4. ESM 模块系统**

项目使用 ESM（`"type": "module"`），所有 import 路径必须写完整扩展名（如 `"./config.js"`）。`tsconfig.json` 中 `moduleResolution` 设为 `"bundler"` 以适配 Bun 打包器对 ESM 的解析方式。

**5. 构建产物体积**

构建产物约 2.30 MB，主要体积来自 React（调试版）和 Zod 的类型系统。如果需要减小体积，可在生产构建时使用 Bun 的 `--minify` 参数，但当前开发阶段不推荐——会增加排查问题的难度。

### 项目架构

```
用户输入 → main.tsx (CLI 入口, Commander.js 解析参数)
              ↓
         App.tsx (Ink 渲染, 状态管理, 确认交互)
              ↓
         engine/index.ts (runQueryLoop: LLM ↔ 工具 循环编排)
              ↓
         engine/api.ts (OpenAI 兼容流式 API, SSE 解析)
              ↓
         tools/ (BaseTool → read/write/edit/bash/grep/glob/list)
              ↓
         Chat.tsx + MarkdownView.tsx (结果渲染)
```

**执行流程**：用户输入 → `runQueryLoop` 发起流式请求 → LLM 返回文本（直接渲染）或 `tool_calls`（工具调用）→ 权限确认（如需要）→ 工具执行 → 结果回传 LLM → 循环直到 LLM 给出纯文本最终回复。

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
  needsApproval = false;  // true = 执行前需用户确认

  async execute(args: Record<string, unknown>) {
    const res = await fetch(args.url as string, { method: args.method as string });
    const body = await res.text();
    return this.ok(body.slice(0, 2000));  // ok() → 成功; fail() → 错误
  }
}
```

在 `src/tools/index.ts` 的 `getAllTools()` 中注册新工具实例即可生效。

### TypeScript 配置说明

`tsconfig.json` 关键项：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  }
}
```

- `target: "ESNext"` / `module: "ESNext"` — 输出最新 ES 标准，交给 Bun 打包器处理
- `moduleResolution: "bundler"` — 适配 Bun 打包器对 `package.json` `"exports"` 字段的解析
- `jsx: "react-jsx"` — React 19 自动 JSX 转换（无需手动 `import React`）
- `strict: true` — 全部严格类型检查，防止隐式 `any`
