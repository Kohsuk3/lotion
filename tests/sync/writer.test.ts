import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ensureDir, writeMarkdown, deleteFile } from "../../src/sync/writer";
import { FileSystemError } from "../../src/utils/errors";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "lotion-writer-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("ensureDir", () => {
  test("ディレクトリを作成できる", async () => {
    const dir = join(tmpDir, "a", "b", "c");
    await ensureDir(dir);
    expect(existsSync(dir)).toBe(true);
  });

  test("既に存在するディレクトリでもエラーにならない", async () => {
    const dir = join(tmpDir, "existing");
    await ensureDir(dir);
    await ensureDir(dir);
    expect(existsSync(dir)).toBe(true);
  });
});

describe("writeMarkdown", () => {
  test("ファイルを書き込める", async () => {
    const fp = join(tmpDir, "test.md");
    await writeMarkdown(fp, "# Hello\n");
    expect(readFileSync(fp, "utf8")).toBe("# Hello\n");
  });

  test("ネストしたディレクトリも自動作成", async () => {
    const fp = join(tmpDir, "deep", "nested", "file.md");
    await writeMarkdown(fp, "content");
    expect(readFileSync(fp, "utf8")).toBe("content");
  });

  test("上書きできる", async () => {
    const fp = join(tmpDir, "overwrite.md");
    await writeMarkdown(fp, "first");
    await writeMarkdown(fp, "second");
    expect(readFileSync(fp, "utf8")).toBe("second");
  });
});

describe("deleteFile", () => {
  test("ファイルを削除できる", async () => {
    const fp = join(tmpDir, "todelete.md");
    writeFileSync(fp, "delete me");
    expect(existsSync(fp)).toBe(true);
    await deleteFile(fp);
    expect(existsSync(fp)).toBe(false);
  });

  test("存在しないファイルでもエラーにならない", async () => {
    await deleteFile(join(tmpDir, "nonexistent.md"));
  });
});
