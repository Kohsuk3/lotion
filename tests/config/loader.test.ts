import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadConfig, saveConfig, configExists, expandHome } from "../../src/config/loader";
import { ConfigError } from "../../src/utils/errors";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "lotion-loader-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("configExists", () => {
  test("ファイルがなければ false", () => {
    expect(configExists(join(tmpDir, "nonexistent.yaml"))).toBe(false);
  });

  test("ファイルがあれば true", () => {
    const p = join(tmpDir, "config.yaml");
    writeFileSync(p, "notion_api_key: key\noutput_dir: ./out\n");
    expect(configExists(p)).toBe(true);
  });
});

describe("loadConfig", () => {
  test("存在しないパスで ConfigError", () => {
    expect(() => loadConfig(join(tmpDir, "nope.yaml"))).toThrow(ConfigError);
  });

  test("不正な YAML で ConfigError", () => {
    const p = join(tmpDir, "bad.yaml");
    writeFileSync(p, "}{not yaml at all");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  test("バリデーション失敗で ConfigError", () => {
    const p = join(tmpDir, "invalid.yaml");
    writeFileSync(p, "notion_api_key: ''\noutput_dir: ./out\n");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  test("正常な YAML を読み込める", () => {
    const p = join(tmpDir, "valid.yaml");
    writeFileSync(
      p,
      `notion_api_key: ntn_test\noutput_dir: /tmp/test-out\nsync_interval: 30\ntargets:\n  - type: database\n    id: abc123\n    name: blog\n`
    );
    const cfg = loadConfig(p);
    expect(cfg.notion_api_key).toBe("ntn_test");
    expect(cfg.sync_interval).toBe(30);
    expect(cfg.targets).toHaveLength(1);
    expect(cfg.targets[0].name).toBe("blog");
  });

  test("output_dir の ~ が展開される", () => {
    const p = join(tmpDir, "home.yaml");
    writeFileSync(p, "notion_api_key: key\noutput_dir: '~/lotion-out'\n");
    const cfg = loadConfig(p);
    expect(cfg.output_dir).not.toContain("~");
    expect(cfg.output_dir).toContain("lotion-out");
  });
});

describe("saveConfig", () => {
  test("config をファイルに保存できる", () => {
    const p = join(tmpDir, "saved.yaml");
    saveConfig(
      {
        notion_api_key: "key123",
        output_dir: "./out",
        sync_interval: 60,
        targets: [],
      },
      p
    );
    const content = readFileSync(p, "utf8");
    expect(content).toContain("key123");
    expect(content).toContain("output_dir");
  });

  test("存在しないディレクトリも作成される", () => {
    const p = join(tmpDir, "deep", "nested", "config.yaml");
    saveConfig(
      {
        notion_api_key: "key",
        output_dir: "./out",
        sync_interval: 60,
        targets: [],
      },
      p
    );
    expect(configExists(p)).toBe(true);
  });
});

describe("expandHome", () => {
  test("~/ をホームディレクトリに展開", () => {
    const result = expandHome("~/foo/bar");
    expect(result).not.toContain("~");
    expect(result).toContain("foo/bar");
  });

  test("~/ 以外はそのまま resolve", () => {
    const result = expandHome("/absolute/path");
    expect(result).toBe("/absolute/path");
  });
});
