export interface SkillMeta {
  name: string;
  description: string;
  source: string;
  prompt: string;
  enabled: boolean;
  installedAt: string;
}

export interface SkillsConfig {
  skills: SkillMeta[];
  autoInstall: boolean;
}
