import { describe, test, expect } from "bun:test";
import { buildFrontmatter } from "../../src/converter/frontmatter";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const fixedDate = new Date("2025-01-15T12:00:00.000Z");

function makePage(
  overrides: Partial<PageObjectResponse> = {}
): PageObjectResponse {
  return {
    id: "page-id-123",
    url: "https://www.notion.so/page-id-123",
    created_time: "2024-12-01T00:00:00.000Z",
    last_edited_time: "2025-01-10T00:00:00.000Z",
    archived: false,
    in_trash: false,
    public_url: null,
    object: "page",
    cover: null,
    icon: null,
    parent: { type: "database_id", database_id: "db-1" },
    properties: {
      Name: {
        type: "title",
        title: [{ plain_text: "Test Page", type: "text", text: { content: "Test Page", link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, href: null }],
        id: "title",
      },
    } as any,
    ...overrides,
  } as PageObjectResponse;
}

describe("buildFrontmatter", () => {
  test("基本的な frontmatter を生成", () => {
    const page = makePage();
    const result = buildFrontmatter(page, {}, fixedDate);
    expect(result).toContain("---\n");
    expect(result).toContain("title: Test Page");
    expect(result).toContain("notion_id: page-id-123");
    expect(result).toContain("notion_url: https://www.notion.so/page-id-123");
    expect(result).toContain("last_synced: \"2025-01-15T12:00:00.000Z\"");
    expect(result.endsWith("---\n")).toBe(true);
  });

  test("title プロパティはスキップされる（title フィールドで出力済み）", () => {
    const page = makePage();
    const result = buildFrontmatter(page, {}, fixedDate);
    const lines = result.split("\n");
    const nameLines = lines.filter((l) => l.startsWith("name:"));
    expect(nameLines).toHaveLength(0);
  });

  test("extraFields が末尾にマージされる", () => {
    const page = makePage();
    const result = buildFrontmatter(page, { draft: true, custom: "value" }, fixedDate);
    expect(result).toContain("draft: true");
    expect(result).toContain("custom: value");
  });

  test("プロパティ名がスネークケースに変換される", () => {
    const page = makePage({
      properties: {
        Name: {
          type: "title",
          title: [{ plain_text: "Test", type: "text", text: { content: "Test", link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, href: null }],
          id: "title",
        },
        "My Status": {
          type: "select",
          select: { name: "Published", id: "s1", color: "green" },
          id: "status",
        },
      } as any,
    });
    const result = buildFrontmatter(page, {}, fixedDate);
    expect(result).toContain("my_status: Published");
  });

  test("null のプロパティは出力されない", () => {
    const page = makePage({
      properties: {
        Name: {
          type: "title",
          title: [{ plain_text: "Test", type: "text", text: { content: "Test", link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, href: null }],
          id: "title",
        },
        Empty: {
          type: "select",
          select: null,
          id: "empty",
        },
      } as any,
    });
    const result = buildFrontmatter(page, {}, fixedDate);
    expect(result).not.toContain("empty:");
  });
});
