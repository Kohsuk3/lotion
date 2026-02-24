import { mkdir, writeFile, unlink } from "fs/promises";
import { dirname } from "path";
import { FileSystemError } from "../utils/errors.js";

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeMarkdown(filePath: string, content: string): Promise<void> {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  } catch (err) {
    throw new FileSystemError(`Failed to write ${filePath}`, err);
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {}
}
