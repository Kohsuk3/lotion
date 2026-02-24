#!/usr/bin/env bun

import { buildCLI } from "../src/cli/index.js";

const program = buildCLI();
program.parse(process.argv);
