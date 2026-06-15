import { z } from "zod";
import { BaseTool } from "./base.js";
import type { ToolResult } from "../types/index.js";
import { getSkillManager } from "../skills/manager.js";

export class UseSkillTool extends BaseTool {
  name = "use_skill";
  description = "加载并使用已安装的技能(skill)来获取专业指导。传入技能名称即可获取该技能的详细操作指南。\n" +
    "可用技能名可通过 /skills list 命令查看。如果技能未安装，系统将尝试自动安装。";
  input_schema = z.object({
    skill_name: z.string().describe("要加载的技能名称"),
    task: z.string().optional().describe("可选：你希望技能协助完成的具体任务描述"),
  });
  needsApproval = false;

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const skillName = args.skill_name as string;
    const mgr = getSkillManager();
    const skill = mgr.getByName(skillName);

    if (!skill) {
      // 尝试从 superpowers 自动安装
      try {
        await mgr.install("https://github.com/obra/superpowers");
        mgr.rescan();
        const recheck = mgr.getByName(skillName);
        if (!recheck) {
          return this.ok(`技能 "${skillName}" 未找到，已尝试从 superpowers 安装但仍未发现该技能。请使用 /skills install <git-url> 手动安装。`);
        }
        return this.ok(
          `技能 "${skillName}" 已自动安装并加载。\n\n## ${recheck.name}\n${recheck.description}\n\n${recheck.prompt}`
        );
      } catch (err: any) {
        return this.ok(`技能 "${skillName}" 未安装，且自动安装失败: ${err.message}。请使用 /skills install <git-url> 手动安装。`);
      }
    }

    if (!skill.enabled) {
      return this.ok(`技能 "${skillName}" 已禁用。使用 /skills enable ${skillName} 启用。`);
    }

    return this.ok(
      `已加载技能 "${skillName}"。\n\n## ${skill.name}\n${skill.description}\n\n${skill.prompt}`
    );
  }
}
