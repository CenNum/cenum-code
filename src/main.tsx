#!/usr/bin/env bun

import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { App } from "./components/App.js";
import { loadConfig, saveConfig } from "./config.js";
import type { CenumConfig } from "./types/index.js";

const program = new Command();

program
  .name("cenum")
  .description("Cenum Code — 智能终端 AI 编程助手")
  .version("0.2.0")
  .option("-p, --prompt <prompt>", "非交互式单次提问")
  .option("-s, --setup", "设置 API 配置")
  .option("-c, --config", "显示当前配置")
  .option("-m, --model <model>", "临时指定模型")
  .action(async (options) => {
    if (options.config) {
      const cfg = loadConfig();
      console.log(JSON.stringify(cfg, null, 2));
      process.exit(0);
    }

    if (options.setup) {
      await runSetup();
      process.exit(0);
    }

    const cfg: CenumConfig = { ...loadConfig() };
    if (options.model) cfg.model = options.model;

    if (!cfg.apiKey) {
      console.log("未配置 API Key。请运行 cenum --setup 进行配置。");
      process.exit(1);
    }

    if (options.prompt) {
      const { waitUntilExit } = render(
        React.createElement(App, { initialPrompt: options.prompt, config: cfg })
      );
      await waitUntilExit();
    } else {
      const { waitUntilExit } = render(
        React.createElement(App, { config: cfg })
      );
      await waitUntilExit();
    }
  });

async function runSetup() {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve));

  console.log("Cenum Code 配置向导\n");

  const apiKey = await ask("API Key: ");
  const baseURL = await ask("API Base URL (默认 https://api.openai.com/v1): ") || "https://api.openai.com/v1";
  const model = await ask("模型 (默认 gpt-4o): ") || "gpt-4o";
  const askWrite = await ask("写文件前是否确认? (y/n, 默认 y): ");
  const askBash = await ask("执行命令前是否确认? (y/n, 默认 y): ");

  saveConfig({
    apiKey,
    baseURL,
    model,
    askBeforeWrite: askWrite.toLowerCase() !== "n",
    askBeforeBash: askBash.toLowerCase() !== "n",
  });

  console.log(`\n配置已保存到 ~/.cenum-code/config.json`);
  rl.close();
}

program.parse();
