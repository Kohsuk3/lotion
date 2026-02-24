import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const STATE_FILE = ".lotion-state.json";

export interface PageState {
  last_edited_time: string;
  local_path: string;
}

export type SyncState = Record<string, PageState>;

export function loadState(outputDir: string): SyncState {
  const statePath = join(outputDir, STATE_FILE);
  if (!existsSync(statePath)) return {};

  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as SyncState;
  } catch {
    return {};
  }
}

export function saveState(outputDir: string, state: SyncState): void {
  const statePath = join(outputDir, STATE_FILE);
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

export function isPageChanged(state: SyncState, pageId: string, lastEditedTime: string): boolean {
  const existing = state[pageId];
  if (!existing) return true;
  return existing.last_edited_time !== lastEditedTime;
}
