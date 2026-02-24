import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runSync } from "./commands/sync.js";
import { runWatch } from "./commands/watch.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(fn: (...args: any[]) => Promise<void>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) =>
    fn(...args).catch(() => {
      process.exit(1);
    });
}

export function buildCLI(): Command {
  const program = new Command();

  program
    .name("lotion")
    .description("Notion → Local Markdown Sync CLI")
    .version("0.1.0");

  program
    .command("init")
    .description("Interactive setup (API key → DB selection → output dir)")
    .action(handleError(async () => {
      await runInit();
    }));

  program
    .command("sync")
    .description("Sync all configured targets")
    .option("--only <name>", "Sync only the specified target by name")
    .action(handleError(async (options: { only?: string }) => {
      await runSync({ only: options.only });
    }));

  program
    .command("watch")
    .description("Continuously sync at a set interval")
    .option("--interval <seconds>", "Polling interval in seconds", parseInt)
    .action(handleError(async (options: { interval?: number }) => {
      await runWatch({ interval: options.interval });
    }));

  return program;
}
