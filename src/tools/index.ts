export { BashTool } from "./bash.js";
export { ReadTool } from "./read.js";
export { WriteTool } from "./write.js";
export { EditTool } from "./edit.js";
export { GrepTool } from "./grep.js";
export { GlobTool } from "./glob.js";
export { ListTool } from "./list.js";

import { BashTool } from "./bash.js";
import { ReadTool } from "./read.js";
import { WriteTool } from "./write.js";
import { EditTool } from "./edit.js";
import { GrepTool } from "./grep.js";
import { GlobTool } from "./glob.js";
import { ListTool } from "./list.js";
import type { ToolDefinition } from "../types/index.js";

export function getAllTools(): ToolDefinition[] {
  return [
    new BashTool(),
    new ReadTool(),
    new WriteTool(),
    new EditTool(),
    new GrepTool(),
    new GlobTool(),
    new ListTool(),
  ];
}
