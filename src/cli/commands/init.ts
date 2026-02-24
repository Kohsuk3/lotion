import { input, password, select, checkbox, confirm } from "@inquirer/prompts";
import { createNotionClient } from "../../notion/client.js";
import { fetchAllDatabases } from "../../notion/fetcher.js";
import { loadConfig, saveConfig, configExists, expandHome } from "../../config/loader.js";
import type { Config, SyncTarget } from "../../config/types.js";
import { logger } from "../../utils/logger.js";

export async function runInit(): Promise<void> {
  logger.info("Welcome to lotion! Let's set things up.");
  logger.dim("─".repeat(40));

  let existingConfig: Partial<Config> = {};
  if (configExists()) {
    try {
      existingConfig = loadConfig();
      logger.warn("Existing config found. Values will be used as defaults.");
    } catch {
      // ignore
    }
  }

  const apiKey = await password({
    message: "Notion API Key (secret_...):",
    mask: "*",
    validate: (v) => v.startsWith("secret_") || "Must start with secret_",
  });

  logger.step("Testing connection...");
  const client = createNotionClient(apiKey);

  let databases;
  try {
    databases = await fetchAllDatabases(client);
    logger.success(`Connected! Found ${databases.length} database(s).`);
  } catch (err) {
    logger.error(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
    throw err instanceof Error ? err : new Error(String(err));
  }

  const outputDir = await input({
    message: "Output directory:",
    default: existingConfig.output_dir ?? "~/lotion-data",
  });

  const syncInterval = await input({
    message: "Sync interval (seconds):",
    default: String(existingConfig.sync_interval ?? 60),
    validate: (v) => {
      const n = parseInt(v, 10);
      return (!isNaN(n) && n > 0) || "Must be a positive number";
    },
  });

  let targets: SyncTarget[] = existingConfig.targets ?? [];

  if (databases.length > 0) {
    const dbChoices = databases.map((db) => {
      const title =
        db.title.map((t) => t.plain_text).join("").trim() || db.id;
      return { name: title, value: { id: db.id, name: title } };
    });

    const selected = await checkbox({
      message: "Select databases to sync:",
      choices: dbChoices,
    });

    targets = selected.map(({ id, name }) => ({
      type: "database" as const,
      id,
      name,
    }));
  } else {
    logger.warn("No databases found. You can manually add targets to ~/.lotion.yaml later.");
  }

  const config: Config = {
    notion_api_key: apiKey,
    output_dir: expandHome(outputDir),
    sync_interval: parseInt(syncInterval, 10),
    targets,
  };

  saveConfig(config);
  logger.success("Config saved to ~/.lotion.yaml");
  logger.dim(`Output dir: ${config.output_dir}`);
  logger.dim(`Targets: ${config.targets.map((t) => t.name).join(", ") || "(none)"}`);
  logger.info("Run 'lotion sync' to start syncing!");
}
