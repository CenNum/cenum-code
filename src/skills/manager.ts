import { existsSync, readdirSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import type { SkillMeta } from "./types.js";
import { discoverSkills, loadSkillFile } from "./loader.js";

const SKILLS_DIR = join(homedir(), ".cenum-code", "skills");
const SKILLS_CONFIG_PATH = join(homedir(), ".cenum-code", "skills.json");

class SkillManager {
  private skills: SkillMeta[] = [];

  constructor() {
    this.ensureDir();
    this.loadConfig();
  }

  private ensureDir(): void {
    if (!existsSync(SKILLS_DIR)) mkdirSync(SKILLS_DIR, { recursive: true });
  }

  private loadConfig(): void {
    try {
      if (existsSync(SKILLS_CONFIG_PATH)) {
        const data = JSON.parse(readFileSync(SKILLS_CONFIG_PATH, "utf-8"));
        this.skills = data.skills || [];
      }
    } catch {}
    this.rescan();
  }

  private saveConfig(): void {
    this.ensureDir();
    writeFileSync(SKILLS_CONFIG_PATH, JSON.stringify({ skills: this.skills }, null, 2), "utf-8");
  }

  // 扫描磁盘同步配置
  rescan(): void {
    const discovered = discoverSkills(SKILLS_DIR);
    const existingMap = new Map(this.skills.map(s => [s.name, s]));

    for (const raw of discovered) {
      const existing = existingMap.get(raw.name);
      if (!existing) {
        this.skills.push({
          name: raw.name,
          description: raw.description,
          source: "local",
          prompt: raw.prompt,
          enabled: true,
          installedAt: new Date().toISOString(),
        });
      } else {
        existing.prompt = raw.prompt;
        existing.description = raw.description;
      }
    }

    this.saveConfig();
  }

  list(): SkillMeta[] {
    return [...this.skills];
  }

  getEnabled(): SkillMeta[] {
    return this.skills.filter(s => s.enabled);
  }

  getByName(name: string): SkillMeta | undefined {
    return this.skills.find(s => s.name === name);
  }

  has(name: string): boolean {
    return this.skills.some(s => s.name === name);
  }

  // 从 git URL 安装 skill
  async install(gitUrl: string): Promise<SkillMeta[]> {
    const repoName = gitUrl.split("/").pop()?.replace(".git", "") || "skill";
    const destDir = join(SKILLS_DIR, repoName);

    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true });
    }

    try {
      execSync(`git clone --depth 1 "${gitUrl}" "${destDir}"`, {
        stdio: "pipe",
        timeout: 60000,
      });
    } catch (err: any) {
      throw new Error(`git clone 失败: ${err.message}`);
    }

    // 发现 skills
    let discovered = discoverSkills(destDir);

    // 如果 repo 根目录有 SKILL.md，也加载
    if (discovered.length === 0) {
      const rootSkill = loadSkillFile(join(destDir, "SKILL.md"));
      if (rootSkill) discovered = [rootSkill];
    }

    if (discovered.length === 0) {
      throw new Error("仓库中未找到任何 SKILL.md 文件，请确认该仓库是有效的 skill 源");
    }

    // 注册
    for (const raw of discovered) {
      const idx = this.skills.findIndex(s => s.name === raw.name);
      if (idx >= 0) {
        this.skills[idx] = { ...this.skills[idx], prompt: raw.prompt, description: raw.description, source: gitUrl };
      } else {
        this.skills.push({
          name: raw.name,
          description: raw.description,
          source: gitUrl,
          prompt: raw.prompt,
          enabled: true,
          installedAt: new Date().toISOString(),
        });
      }
    }

    this.saveConfig();
    return discovered.map(d => this.skills.find(s => s.name === d.name)!);
  }

  async remove(name: string): Promise<void> {
    this.skills = this.skills.filter(s => s.name !== name);
    if (existsSync(SKILLS_DIR)) {
      try {
        for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const subs = discoverSkills(join(SKILLS_DIR, entry.name));
            if (subs.some(s => s.name === name)) {
              rmSync(join(SKILLS_DIR, entry.name), { recursive: true, force: true });
            }
          }
        }
      } catch {}
    }
    this.saveConfig();
  }

  setEnabled(name: string, enabled: boolean): boolean {
    const skill = this.skills.find(s => s.name === name);
    if (!skill) return false;
    skill.enabled = enabled;
    this.saveConfig();
    return true;
  }

  // 生成注入 system prompt 的技能段落
  getSystemPrompt(): string {
    const enabled = this.getEnabled();
    if (enabled.length === 0) return "";

    const parts: string[] = [];
    parts.push("\n## 可用技能 (Skills)\n");
    parts.push("你有以下已安装的技能可用。当任务匹配技能描述时，主动加载对应技能获取专业指导。加载技能使用 `use_skill` 工具。\n");

    for (const skill of enabled) {
      parts.push(`### ${skill.name}`);
      parts.push(`描述: ${skill.description}`);
      parts.push(`技能指南:\n${skill.prompt}\n`);
    }

    return parts.join("\n");
  }
}

let _instance: SkillManager | null = null;

export function getSkillManager(): SkillManager {
  if (!_instance) _instance = new SkillManager();
  return _instance;
}

export { SkillManager };
