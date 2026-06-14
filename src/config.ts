import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CenumConfig } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".cenum-code");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULTS: CenumConfig = {
  model: "gpt-4o",
  maxTokens: 8192,
  permissionMode: "default",
  workingDir: process.cwd(),
  askBeforeWrite: true,
  askBeforeBash: true,
};

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadConfig(): CenumConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      return { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) };
    }
  } catch {}
  // 迁移旧配置
  const oldPath = join(homedir(), ".marvis-code", "config.json");
  try {
    if (existsSync(oldPath)) {
      const old = JSON.parse(readFileSync(oldPath, "utf-8"));
      saveConfig(old);
      return { ...DEFAULTS, ...old };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveConfig(config: Partial<CenumConfig>): void {
  ensureConfigDir();
  const merged = { ...loadConfig(), ...config };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
