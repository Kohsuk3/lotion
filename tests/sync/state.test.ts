import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadState, saveState, isPageChanged, type SyncState } from "../../src/sync/state";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "lotion-state-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("loadState", () => {
  test("ファイルがなければ空オブジェクト", () => {
    expect(loadState(tmpDir)).toEqual({});
  });

  test("正常な JSON を読み込める", () => {
    const state: SyncState = {
      "page-1": { last_edited_time: "2024-01-01T00:00:00.000Z", local_path: "/tmp/test.md" },
    };
    writeFileSync(join(tmpDir, ".lotion-state.json"), JSON.stringify(state));
    expect(loadState(tmpDir)).toEqual(state);
  });

  test("壊れた JSON は空オブジェクトを返す", () => {
    writeFileSync(join(tmpDir, ".lotion-state.json"), "not json{{{");
    expect(loadState(tmpDir)).toEqual({});
  });

  test("配列が入ってたら空オブジェクトを返す", () => {
    writeFileSync(join(tmpDir, ".lotion-state.json"), "[]");
    expect(loadState(tmpDir)).toEqual({});
  });

  test("null が入ってたら空オブジェクトを返す", () => {
    writeFileSync(join(tmpDir, ".lotion-state.json"), "null");
    expect(loadState(tmpDir)).toEqual({});
  });
});

describe("saveState", () => {
  test("state をファイルに保存できる", () => {
    const state: SyncState = {
      "page-1": { last_edited_time: "2024-01-01T00:00:00.000Z", local_path: "/out/test.md" },
    };
    saveState(tmpDir, state);
    const content = readFileSync(join(tmpDir, ".lotion-state.json"), "utf8");
    expect(JSON.parse(content)).toEqual(state);
  });

  test("上書き保存ができる", () => {
    saveState(tmpDir, { "p1": { last_edited_time: "t1", local_path: "a" } });
    saveState(tmpDir, { "p2": { last_edited_time: "t2", local_path: "b" } });
    const loaded = loadState(tmpDir);
    expect(loaded).toHaveProperty("p2");
    expect(loaded).not.toHaveProperty("p1");
  });
});

describe("isPageChanged", () => {
  test("state にページがなければ true", () => {
    expect(isPageChanged({}, "new-page", "2024-01-01")).toBe(true);
  });

  test("last_edited_time が同じなら false", () => {
    const state: SyncState = {
      "page-1": { last_edited_time: "2024-01-01", local_path: "/test.md" },
    };
    expect(isPageChanged(state, "page-1", "2024-01-01")).toBe(false);
  });

  test("last_edited_time が異なれば true", () => {
    const state: SyncState = {
      "page-1": { last_edited_time: "2024-01-01", local_path: "/test.md" },
    };
    expect(isPageChanged(state, "page-1", "2024-06-01")).toBe(true);
  });
});
