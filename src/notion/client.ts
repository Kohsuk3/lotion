import { Client, isNotionClientError, APIErrorCode } from "@notionhq/client";
import { NotionAPIError, RateLimitError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export function createNotionClient(apiKey: string): Client {
  return new Client({ auth: apiKey });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (isNotionClientError(err)) {
        if (err.code === APIErrorCode.RateLimited) {
          if (attempt >= retries) {
            throw new RateLimitError();
          }
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn(`Rate limited. Retrying in ${backoff}ms... (${attempt + 1}/${retries})`);
          await sleep(backoff);
          attempt++;
          continue;
        }

        throw new NotionAPIError(
          err.message,
          "status" in err ? (err as { status: number }).status : undefined,
          err
        );
      }

      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
