export class LotionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LotionError";
  }
}

export class ConfigError extends LotionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ConfigError";
  }
}

export class NotionAPIError extends LotionError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = "NotionAPIError";
  }
}

export class RateLimitError extends NotionAPIError {
  constructor(public readonly retryAfter?: number) {
    super("Notion API rate limit exceeded", 429);
    this.name = "RateLimitError";
  }
}

export class SyncError extends LotionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "SyncError";
  }
}

export class FileSystemError extends LotionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "FileSystemError";
  }
}
