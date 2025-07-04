#!/usr/bin/env node

import { templateCommand } from "./commands/template.command";
import { applyCommand } from "./commands/apply.command";
import { getCommand } from "./commands/get.command";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Missing command. Try: greet or math");
  process.exit(1);
}

switch (command) {
  case "get":
    getCommand(args);
    break;

  case "apply":
    applyCommand(args);
    break;

  case "template":
    templateCommand(args);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
