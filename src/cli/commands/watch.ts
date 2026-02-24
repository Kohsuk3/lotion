import { loadConfig } from "../../config/loader.js";
import { createNotionClient } from "../../notion/client.js";
import { syncAll, printSummary } from "../../sync/engine.js";
import { logger } from "../../utils/logger.js";

interface WatchOptions {
  interval?: number;
}

export async function runWatch(options: WatchOptions = {}): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    logger.error(`${err}`);
    throw err;
  }

  const intervalSec = options.interval ?? config.sync_interval;
  const client = createNotionClient(config.notion_api_key);

  logger.info(`Watch mode started. Syncing every ${intervalSec}s. Press Ctrl+C to stop.`);

  const run = async () => {
    logger.step(`[${new Date().toLocaleTimeString()}] Syncing...`);
    try {
      const results = await syncAll(client, config);
      if (results.length > 0) {
        printSummary(results);
      }
    } catch (err) {
      logger.error(`Sync error: ${err}`);
    }
  };

  const scheduleNext = () => {
    setTimeout(async () => {
      await run();
      scheduleNext();
    }, intervalSec * 1000);
  };

  await run();
  scheduleNext();

  process.on("SIGINT", () => {
    logger.info("\nWatch mode stopped.");
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
