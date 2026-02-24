import type { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  DataSourceObjectResponse,
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints.js";
import { withRetry } from "./client.js";
import { logger } from "../utils/logger.js";

export type NotionPage = PageObjectResponse;
export type NotionDatabase = DataSourceObjectResponse;

export async function fetchDataSource(
  client: Client,
  dataSourceId: string
): Promise<NotionDatabase> {
  return withRetry(() =>
    client.dataSources.retrieve({ data_source_id: dataSourceId }) as Promise<NotionDatabase>
  );
}

export async function fetchDatabasePages(
  client: Client,
  dataSourceId: string,
  filter?: QueryDataSourceParameters["filter"],
  lastSyncedTime?: string
): Promise<NotionPage[]> {
  const timeFilter = lastSyncedTime
    ? {
        timestamp: "last_edited_time" as const,
        last_edited_time: { after: lastSyncedTime },
      }
    : undefined;

  const combinedFilter: QueryDataSourceParameters["filter"] = timeFilter
    ? filter
      ? ({ and: [filter, timeFilter] } as QueryDataSourceParameters["filter"])
      : (timeFilter as QueryDataSourceParameters["filter"])
    : filter;

  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await withRetry(() =>
      client.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        filter: combinedFilter,
        page_size: 100,
      })
    );

    for (const result of (response as { results: Array<{ object: string }> }).results) {
      if (result.object === "page") {
        pages.push(result as NotionPage);
      }
    }

    const r = response as { has_more: boolean; next_cursor: string | null };
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
    logger.debug(`Fetched ${pages.length} pages so far...`);
  }

  return pages;
}

export async function fetchPage(
  client: Client,
  pageId: string
): Promise<NotionPage> {
  return withRetry(() =>
    client.pages.retrieve({ page_id: pageId }) as Promise<NotionPage>
  );
}

export async function fetchAllDatabases(client: Client): Promise<NotionDatabase[]> {
  const databases: NotionDatabase[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await withRetry(() =>
      client.search({
        filter: { property: "object", value: "data_source" },
        start_cursor: cursor,
        page_size: 100,
      })
    );

    for (const result of response.results) {
      if (result.object === "data_source") {
        databases.push(result as NotionDatabase);
      }
    }

    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }

  return databases;
}
