#!/usr/bin/env node

import { templateCommand } from "./commands/template.command";
import { applyCommand } from "./commands/apply.command";
import { getCommand } from "./commands/get.command";
import { setCommand } from "./commands/set.command";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error(`
NAME:
  resolve-config - Resolve configuration files

USAGE:
  Resolve configuration files using templates and (remote) variables.

  Documentation is available at https://github.com/poviolabs/resolve-config
  
VERSION:
  ${process.env.RESOLVE_CONFIG_VERSION} 

AUTHOR:
  {Marko Zabreznik marko.zabreznik@povio.com}

COMMANDS
  get - Get a configuration value
  apply - Apply a configuration set
  set - Set a value in a yaml file
  
COPYRIGHT:
  (c) 2025 Povio inc., All rights reserved.
`);
  process.exit(1);
}

switch (command) {
  case "get":
    getCommand(args);
    break;

  case "set":
    setCommand(args);
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
