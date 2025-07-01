#!/usr/bin/env node

import { resolveCommand } from "./commands/resolve";

// Extract the subcommand and remaining args
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Missing command. Try: greet or math");
  process.exit(1);
}

switch (command) {
  case "resolve":
    resolveCommand(args);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
