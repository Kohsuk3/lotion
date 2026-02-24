import { join, resolve, relative } from "path";
import pLimit from "p-limit";
import type { Client } from "@notionhq/client";
import type { Config, SyncTarget } from "../config/types.js";
import { fetchDatabasePages, fetchPage } from "../notion/fetcher.js";
import { convertPageToMarkdown } from "../converter/index.js";
import { slugify, resolveSlugConflict } from "../converter/slugify.js";
import { extractTitle } from "../converter/properties.js";
import { loadState, saveState, isPageChanged, type SyncState } from "./state.js";
import { ensureDir, writeMarkdown } from "./writer.js";
import { logger } from "../utils/logger.js";
import { SyncError } from "../utils/errors.js";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

const CONCURRENCY = 5;

export interface SyncResult {
  target: string;
  updated: number;
  skipped: number;
  errors: number;
}

export async function syncTarget(
  client: Client,
  config: Config,
  target: SyncTarget,
  state: SyncState
): Promise<SyncResult> {
  const resolved = resolve(config.output_dir, target.name);
  const rel = relative(config.output_dir, resolved);
  if (rel.startsWith("..") || rel.includes("/..")) {
    throw new SyncError(`Invalid target name: "${target.name}" escapes output directory`);
  }

  const outputDir = join(config.output_dir, target.name);
  await ensureDir(config.output_dir);
  await ensureDir(outputDir);

  const result: SyncResult = { target: target.name, updated: 0, skipped: 0, errors: 0 };

  logger.step(`Syncing "${target.name}" (${target.type}: ${target.id})`);

  let pages: PageObjectResponse[] = [];
  if (target.type === "database") {
    const lastSyncedTimes = Object.values(state).map((s) => s.last_edited_time);
    const lastSyncedTime = lastSyncedTimes.length > 0
      ? lastSyncedTimes.sort()[0]
      : undefined;

    pages = await fetchDatabasePages(client, target.id, undefined, lastSyncedTime);
  } else {
    pages = [await fetchPage(client, target.id)];
  }

  logger.info(`Found ${pages.length} pages in "${target.name}"`);

  const usedSlugs = new Set<string>();
  const limit = pLimit(CONCURRENCY);

  const tasks = pages.map((page) =>
    limit(async () => {
      try {
        if (!isPageChanged(state, page.id, page.last_edited_time)) {
          result.skipped++;
          return;
        }

        const title = extractTitle(page.properties);
        let slug = slugify(title, page.id);

        if (usedSlugs.has(slug)) {
          slug = resolveSlugConflict(slug, page.id);
        }
        usedSlugs.add(slug);

        const filePath = join(outputDir, slug);
        const markdown = await convertPageToMarkdown(client, page);
        await writeMarkdown(filePath, markdown);

        state[page.id] = {
          last_edited_time: page.last_edited_time,
          local_path: filePath,
        };

        result.updated++;
        logger.success(`  ${slug}`);
      } catch (err) {
        result.errors++;
        logger.error(`  Failed to sync page ${page.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  await Promise.all(tasks);

  return result;
}

export async function syncAll(
  client: Client,
  config: Config,
  onlyName?: string
): Promise<SyncResult[]> {
  const targets = onlyName
    ? config.targets.filter((t) => t.name === onlyName)
    : config.targets;

  if (targets.length === 0) {
    if (onlyName) {
      logger.warn(`No target named "${onlyName}" found in config.`);
    } else {
      logger.warn("No sync targets configured. Run 'lotion init' to add targets.");
    }
    return [];
  }

  const state = loadState(config.output_dir);

  const results = await Promise.all(
    targets.map((target) => syncTarget(client, config, target, state))
  );

  saveState(config.output_dir, state);

  for (const r of results) {
    logger.info(
      `"${r.target}": ${r.updated} updated, ${r.skipped} skipped, ${r.errors} errors`
    );
  }

  return results;
}

export function printSummary(results: SyncResult[]): void {
  const total = results.reduce(
    (acc, r) => ({
      updated: acc.updated + r.updated,
      skipped: acc.skipped + r.skipped,
      errors: acc.errors + r.errors,
    }),
    { updated: 0, skipped: 0, errors: 0 }
  );

  logger.dim("─".repeat(40));
  logger.info(
    `Done: ${total.updated} updated, ${total.skipped} skipped, ${total.errors} errors`
  );
}
