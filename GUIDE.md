# Cenum Code 入门指南

## 1. 前置条件

系统已安装 **Bun**（已就绪），无需额外安装。

---

## 2. 获取 API Key

Cenum Code 兼容任何 OpenAI 格式的 API，以下任选其一：

| 服务商 | 获取地址 |
|---|---|
| OpenAI 官方 | https://platform.openai.com/api-keys |
| 本地 Ollama | 无需 Key，Base URL 填 `http://localhost:11434/v1` |
| 本地 vLLM | 无需 Key，Base URL 填 `http://localhost:8000/v1` |
| DeepSeek | https://platform.deepseek.com/api_keys |
| 其他中转/代理 | 按服务商提供 |

---

## 3. 配置（三选一）

### 方式 A：交互式配置（推荐）

```bash
cd /Users/a123456/Desktop/cenum-code
bun run dist/main.js --setup
```

按提示依次输入 API Key、Base URL（可留空）、模型名（可留空）。

### 方式 B：环境变量

```bash
export OPENAI_API_KEY="sk-your-key-here"
export OPENAI_BASE_URL="https://api.openai.com/v1"   # 可选
```

### 方式 C：配置文件

直接编辑 `~/.cenum-code/config.json`：

```json
{
  "apiKey": "sk-your-key-here",
  "baseURL": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "maxTokens": 8192
}
```

---

## 4. 启动

```bash
cd /Users/a123456/Desktop/cenum-code
bun run dist/main.js
```

看到 `> ` 提示符即进入交互模式。

### 非交互模式（脚本/管道场景）

```bash
# 单次问答
bun run dist/main.js -p "src/ 目录下有哪些文件？"

# 指定模型
bun run dist/main.js --model gpt-4o-mini -p "解释这段代码"

# 输出到文件
bun run dist/main.js -p "列出所有 TODO 注释" > result.txt
```

### 开发模式（热重载）

```bash
bun run dev
```

---

## 5. 内置命令

在交互模式中输入以下斜杠命令：

| 命令 | 作用 |
|---|---|
| `/help` | 查看可用命令 |
| `/clear` | 清空当前对话 |
| `/model` | 查看当前使用的模型 |
| `/config` | 查看完整配置 |
| `/exit` | 退出 |
| `Ctrl+C` | 中断当前请求 |
| `Ctrl+D` | 退出程序 |

---

## 6. 典型工作流

### 场景一：分析项目代码

```
> 分析 src/engine/ 目录的架构，列出各文件的职责
> read_file src/engine/index.ts 的前 50 行
> 这段代码有什么潜在的性能问题？
```

### 场景二：修复 Bug

```
> grep 工具搜索 "undefined is not" 相关的错误处理
> 读取 src/tools/bash.ts，检查超时处理是否完善
> 帮我修复超时后进程残留的问题
```

### 场景三：生成代码

```
> 在 src/tools/ 下创建一个 http.ts 工具，支持 GET/POST 请求
> 为它写单元测试
```

---

## 7. 工具清单

AI 可调用以下工具操作你的文件系统：

| 工具 | 用途 | 示例 |
|---|---|---|
| `read_file` | 读取文件 | 查看源码 |
| `write_file` | 创建/覆盖文件 | 生成新代码 |
| `edit_file` | 精确替换文本 | 修改某行代码 |
| `bash` | 执行命令 | `npm test`、`git diff` |
| `grep` | 搜索代码 | 找所有 TODO |
| `glob` | 匹配文件名 | 找所有 `.tsx` 文件 |
| `list_dir` | 列出目录 | 看项目结构 |

`bash` 和 `write_file`/`edit_file` 需要你确认后才执行。

---

## 8. 进阶

### 链接为全局命令

```bash
cd /Users/a123456/Desktop/cenum-code
bun link
```

之后在任意目录直接输入 `cenum` 即可启动。

### 使用本地模型（Ollama）

```bash
# 先启动 Ollama
ollama serve

# 配置
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_API_KEY="ollama"  # Ollama 不校验 Key，随便填

# 使用
bun run dist/main.js --model llama3.2 -p "你好"
```

### 权限模式

```bash
# 默认模式：写文件和执行命令需确认
bun run dist/main.js --permission-mode default

# 自动模式：跳过确认（谨慎使用）
bun run dist/main.js --permission-mode auto

# 计划模式：只读不写
bun run dist/main.js --permission-mode plan
```
