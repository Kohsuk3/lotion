import { describe, test, expect } from "bun:test";
import { slugify, resolveSlugConflict } from "../../src/converter/slugify";

const id = "abcdef1234567890";

describe("slugify", () => {
  test("ASCII タイトルをケバブケースに変換", () => {
    expect(slugify("Hello World", id)).toBe("hello-world.md");
  });

  test("特殊文字を除去", () => {
    expect(slugify("Hello!@#World", id)).toBe("helloworld.md");
  });

  test("空タイトルは notionId 先頭8文字", () => {
    expect(slugify("", id)).toBe("abcdef12.md");
  });

  test("空白のみのタイトルも notionId フォールバック", () => {
    expect(slugify("   ", id)).toBe("abcdef12.md");
  });

  test("日本語タイトルはそのまま保持", () => {
    expect(slugify("記事タイトル", id)).toBe("記事タイトル.md");
  });

  test("日本語タイトルの禁止文字をハイフンに", () => {
    expect(slugify("記事/タイトル", id)).toBe("記事-タイトル.md");
  });

  test("連続ドットを単一ドットに（パストラバーサル防御）", () => {
    // ASCII ブランチ: ドットやスラッシュは除去される
    expect(slugify("../secret", id)).toBe("secret.md");
    // 非 ASCII ブランチ: 連続ドットは単一ドットに、スラッシュはハイフンに
    const result = slugify("日本語/../secret", id);
    expect(result).not.toContain("..");
  });

  test("連続ハイフンを1つに", () => {
    expect(slugify("hello---world", id)).toBe("hello-world.md");
  });

  test("先頭・末尾のハイフンを除去", () => {
    expect(slugify("-hello-", id)).toBe("hello.md");
  });

  test("数字を含む ASCII タイトル", () => {
    expect(slugify("Chapter 1 Introduction", id)).toBe("chapter-1-introduction.md");
  });
});

describe("resolveSlugConflict", () => {
  test("slug に notionId 4文字を付加", () => {
    expect(resolveSlugConflict("hello-world.md", id)).toBe("hello-world-abcd.md");
  });

  test(".md 拡張子が二重にならない", () => {
    const result = resolveSlugConflict("test.md", id);
    expect(result.match(/\.md/g)?.length).toBe(1);
  });

  test(".md がなくても正しく付加される", () => {
    expect(resolveSlugConflict("readme", id)).toBe("readme-abcd.md");
  });
});
