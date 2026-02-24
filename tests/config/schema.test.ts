import { describe, test, expect } from "bun:test";
import { ConfigSchema } from "../../src/config/schema";

describe("ConfigSchema", () => {
  test("valid な config をパースできる", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "ntn_test_key",
      output_dir: "./output",
      sync_interval: 120,
      targets: [{ type: "database", id: "abc123", name: "blog" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notion_api_key).toBe("ntn_test_key");
      expect(result.data.sync_interval).toBe(120);
      expect(result.data.targets).toHaveLength(1);
    }
  });

  test("sync_interval のデフォルトは 60", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sync_interval).toBe(60);
    }
  });

  test("targets のデフォルトは空配列", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targets).toEqual([]);
    }
  });

  test("notion_api_key が空だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "",
      output_dir: "./out",
    });
    expect(result.success).toBe(false);
  });

  test("output_dir が空だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "",
    });
    expect(result.success).toBe(false);
  });

  test("sync_interval が負数だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
      sync_interval: -1,
    });
    expect(result.success).toBe(false);
  });

  test("sync_interval が小数だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
      sync_interval: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test("targets 内の type が不正だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
      targets: [{ type: "invalid", id: "abc", name: "test" }],
    });
    expect(result.success).toBe(false);
  });

  test("targets 内の id が空だと失敗", () => {
    const result = ConfigSchema.safeParse({
      notion_api_key: "key",
      output_dir: "./out",
      targets: [{ type: "database", id: "", name: "test" }],
    });
    expect(result.success).toBe(false);
  });
});
