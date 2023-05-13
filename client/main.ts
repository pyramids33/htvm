import { cmd } from "./cli/cmd.ts";
cmd.parseAsync().catch(console.error);