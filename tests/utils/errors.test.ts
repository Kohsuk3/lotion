import { describe, test, expect } from "bun:test";
import {
  LotionError,
  ConfigError,
  NotionAPIError,
  RateLimitError,
  SyncError,
  FileSystemError,
} from "../../src/utils/errors";

describe("LotionError", () => {
  test("name と message が正しくセットされる", () => {
    const err = new LotionError("something broke");
    expect(err.name).toBe("LotionError");
    expect(err.message).toBe("something broke");
    expect(err.cause).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
  });

  test("cause を保持できる", () => {
    const original = new Error("original");
    const err = new LotionError("wrapped", original);
    expect(err.cause).toBe(original);
  });
});

describe("ConfigError", () => {
  test("LotionError を継承している", () => {
    const err = new ConfigError("bad config");
    expect(err.name).toBe("ConfigError");
    expect(err).toBeInstanceOf(LotionError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("NotionAPIError", () => {
  test("statusCode を保持できる", () => {
    const err = new NotionAPIError("api failure", 500);
    expect(err.name).toBe("NotionAPIError");
    expect(err.statusCode).toBe(500);
    expect(err).toBeInstanceOf(LotionError);
  });

  test("statusCode なしでも動く", () => {
    const err = new NotionAPIError("unknown");
    expect(err.statusCode).toBeUndefined();
  });
});

describe("RateLimitError", () => {
  test("固定メッセージとステータス 429", () => {
    const err = new RateLimitError();
    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("Notion API rate limit exceeded");
    expect(err.statusCode).toBe(429);
    expect(err).toBeInstanceOf(NotionAPIError);
  });

  test("retryAfter を保持できる", () => {
    const err = new RateLimitError(30);
    expect(err.retryAfter).toBe(30);
  });
});

describe("SyncError", () => {
  test("LotionError を継承している", () => {
    const err = new SyncError("sync failed");
    expect(err.name).toBe("SyncError");
    expect(err).toBeInstanceOf(LotionError);
  });
});

describe("FileSystemError", () => {
  test("LotionError を継承している", () => {
    const err = new FileSystemError("write failed");
    expect(err.name).toBe("FileSystemError");
    expect(err).toBeInstanceOf(LotionError);
  });
});
