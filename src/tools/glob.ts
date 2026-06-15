import { z } from "zod";
import * as path from "path";
import { BaseTool } from "./base.js";

export class GlobTool extends BaseTool {
  name = "glob";
  description = "使用通配符模式搜索匹配的文件路径，返回匹配的文件列表。适合按文件名模式查找文件。";
  needsApproval = false;

  input_schema = z.object({
    pattern: z.string().describe("通配符模式，如 '**/*.ts' 或 'src/**/*.test.ts'"),
    dir: z.string().optional().describe("搜索的根目录，默认为当前工作目录"),
  });

  async execute(args: Record<string, unknown>) {
    const pattern = args.pattern as string;
    const dir = (args.dir as string) || process.cwd();

    try {
      const glob = new Bun.Glob(pattern);
      const results: string[] = [];
      const scanDir = path.isAbsolute(dir) ? dir : path.resolve(dir);
      
      for await (const file of glob.scan({ cwd: scanDir, absolute: true })) {
        results.push(file);
      }

      if (results.length === 0) {
        return this.ok("没有匹配到任何文件。");
      }

      // 限制返回数量
      const maxResults = 200;
      const truncated = results.slice(0, maxResults);
      let output = truncated.join("\n");
      if (results.length > maxResults) {
        output += `\n\n... 还有 ${results.length - maxResults} 个文件未显示。`;
      }

      return this.ok(output);
    } catch (err: any) {
      return this.fail(`glob 执行失败: ${err.message}`);
    }
  }
}
