import { describe, test, expect } from "bun:test";
import { pageBodyToMarkdown } from "../../src/converter/blocks";
import type { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

// ──────────────────────────────────────────────
// Mock client builder
// ──────────────────────────────────────────────

function makeBlock(type: string, extra: object, id = "block-1"): BlockObjectResponse {
  return {
    object: "block",
    id,
    type,
    has_children: false,
    created_time: "",
    last_edited_time: "",
    created_by: { object: "user", id: "" },
    last_edited_by: { object: "user", id: "" },
    parent: { type: "page_id", page_id: "page-1" },
    archived: false,
    in_trash: false,
    [type]: extra,
  } as unknown as BlockObjectResponse;
}

function richText(text: string) {
  return [{
    type: "text",
    plain_text: text,
    href: null,
    annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
    text: { content: text, link: null },
  }];
}

function mockClient(blocks: BlockObjectResponse[]): Client {
  return {
    blocks: {
      children: {
        list: () => Promise.resolve({ results: blocks, has_more: false, next_cursor: null, object: "list", type: "block", block: {} }),
      },
    },
  } as unknown as Client;
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("pageBodyToMarkdown", () => {
  test("paragraph", async () => {
    const client = mockClient([makeBlock("paragraph", { rich_text: richText("Hello world"), color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("Hello world");
  });

  test("heading_1", async () => {
    const client = mockClient([makeBlock("heading_1", { rich_text: richText("Title"), color: "default", is_toggleable: false })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("# Title");
  });

  test("heading_2", async () => {
    const client = mockClient([makeBlock("heading_2", { rich_text: richText("Section"), color: "default", is_toggleable: false })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("## Section");
  });

  test("heading_3", async () => {
    const client = mockClient([makeBlock("heading_3", { rich_text: richText("Sub"), color: "default", is_toggleable: false })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("### Sub");
  });

  test("bulleted_list_item", async () => {
    const client = mockClient([makeBlock("bulleted_list_item", { rich_text: richText("Item"), color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("- Item");
  });

  test("numbered_list_item", async () => {
    const client = mockClient([makeBlock("numbered_list_item", { rich_text: richText("Step"), color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("1. Step");
  });

  test("to_do unchecked", async () => {
    const client = mockClient([makeBlock("to_do", { rich_text: richText("Task"), checked: false, color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("- [ ] Task");
  });

  test("to_do checked", async () => {
    const client = mockClient([makeBlock("to_do", { rich_text: richText("Done"), checked: true, color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("- [x] Done");
  });

  test("quote", async () => {
    const client = mockClient([makeBlock("quote", { rich_text: richText("Wisdom"), color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("> Wisdom");
  });

  test("code block", async () => {
    const client = mockClient([makeBlock("code", { rich_text: richText("const x = 1"), language: "typescript", caption: [] })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("```typescript\nconst x = 1\n```");
  });

  test("divider", async () => {
    const client = mockClient([makeBlock("divider", {})]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("---");
  });

  test("equation", async () => {
    const client = mockClient([makeBlock("equation", { expression: "E=mc^2" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("$$E=mc^2$$");
  });

  test("image external", async () => {
    const client = mockClient([makeBlock("image", { type: "external", external: { url: "https://img.example.com/pic.png" }, caption: richText("Photo") })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("![Photo](https://img.example.com/pic.png)");
  });

  test("image with no caption", async () => {
    const client = mockClient([makeBlock("image", { type: "external", external: { url: "https://img.example.com/pic.png" }, caption: [] })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("![image](https://img.example.com/pic.png)");
  });

  test("bookmark", async () => {
    const client = mockClient([makeBlock("bookmark", { url: "https://example.com", caption: [] })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("[https://example.com](https://example.com)");
  });

  test("bold annotation", async () => {
    const boldRT = [{ ...richText("bold")[0], annotations: { ...richText("bold")[0].annotations, bold: true } }];
    const client = mockClient([makeBlock("paragraph", { rich_text: boldRT, color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("**bold**");
  });

  test("italic annotation", async () => {
    const italicRT = [{ ...richText("italic")[0], annotations: { ...richText("italic")[0].annotations, italic: true } }];
    const client = mockClient([makeBlock("paragraph", { rich_text: italicRT, color: "default" })]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("_italic_");
  });

  test("empty page returns empty string", async () => {
    const client = mockClient([]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("");
  });

  test("multiple blocks", async () => {
    const client = mockClient([
      makeBlock("heading_1", { rich_text: richText("Title"), color: "default", is_toggleable: false }, "b1"),
      makeBlock("paragraph", { rich_text: richText("Body"), color: "default" }, "b2"),
    ]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("# Title\nBody");
  });

  test("unsupported block returns nothing", async () => {
    const client = mockClient([makeBlock("unsupported", {})]);
    expect(await pageBodyToMarkdown(client, "page-1")).toBe("");
  });
});
