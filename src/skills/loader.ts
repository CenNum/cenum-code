import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export interface RawSkill {
  name: string;
  description: string;
  prompt: string;
}

// 解析 SKILL.md 的 YAML front matter（无需第三方库，正则解析）
export function parseFrontMatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const metaStr = match[1];
  const body = match[2];
  const meta: Record<string, string> = {};

  for (const line of metaStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      meta[key] = value;
    }
  }

  return { meta, body };
}

// 加载单个 SKILL.md
export function loadSkillFile(filePath: string): RawSkill | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontMatter(content);
    if (!meta.name) return null;
    return {
      name: meta.name,
      description: meta.description || "",
      prompt: body.trim(),
    };
  } catch {
    return null;
  }
}

// 递归扫描目录发现所有 SKILL.md（兼容 superpowers 的 skills/ 子目录结构）
export function discoverSkills(dir: string): RawSkill[] {
  const skills: RawSkill[] = [];
  if (!existsSync(dir)) return skills;

  // 检查当前目录是否有 SKILL.md
  const skillMd = join(dir, "SKILL.md");
  if (existsSync(skillMd)) {
    const skill = loadSkillFile(skillMd);
    if (skill) skills.push(skill);
  }

  // 检查 skills/ 子目录（superpowers 结构）
  const skillsSubDir = join(dir, "skills");
  if (existsSync(skillsSubDir)) {
    try {
      for (const entry of readdirSync(skillsSubDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          skills.push(...discoverSkills(join(skillsSubDir, entry.name)));
        }
      }
    } catch {}
  }

  return skills;
}
