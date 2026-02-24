import type { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { buildFrontmatter } from "./frontmatter.js";
import { extractTitle } from "./properties.js";
import { pageBodyToMarkdown } from "./blocks.js";

export async function convertPageToMarkdown(
  client: Client,
  page: PageObjectResponse
): Promise<string> {
  const title = extractTitle(page.properties);
  const bodyMd = await pageBodyToMarkdown(client, page.id);
  const frontmatter = buildFrontmatter(page);
  const heading = title ? `# ${title}\n\n` : "";

  return `${frontmatter}\n${heading}${bodyMd}`;
}
