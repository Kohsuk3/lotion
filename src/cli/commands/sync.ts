import { loadConfig } from "../../config/loader.js";
import { createNotionClient } from "../../notion/client.js";
import { syncAll, printSummary } from "../../sync/engine.js";
import { logger } from "../../utils/logger.js";

interface SyncOptions {
  only?: string;
}

export async function runSync(options: SyncOptions = {}): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    logger.error(`${err}`);
    throw err;
  }

  const client = createNotionClient(config.notion_api_key);

  try {
    const results = await syncAll(client, config, options.only);
    if (results.length > 0) {
      printSummary(results);
    }
  } catch (err) {
    logger.error(`Sync failed: ${err}`);
    throw err;
  }
}
