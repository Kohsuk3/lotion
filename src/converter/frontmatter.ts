import yaml from "js-yaml";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { serializeProperty, extractTitle } from "./properties.js";

const SKIP_PROPERTY_TYPES = new Set(["title"]);

export interface FrontmatterData {
  [key: string]: unknown;
}

export function buildFrontmatter(
  page: PageObjectResponse,
  extraFields: FrontmatterData = {},
  now = new Date()
): string {
  const data: FrontmatterData = {};

  const title = extractTitle(page.properties);
  data.title = title;

  for (const [name, prop] of Object.entries(page.properties)) {
    if (SKIP_PROPERTY_TYPES.has(prop.type)) continue;
    const value = serializeProperty(prop);
    if (value !== null && value !== undefined) {
      const key = toSnakeCase(name);
      data[key] = value;
    }
  }

  data.notion_id = page.id;
  data.notion_url = page.url;
  data.last_synced = now.toISOString();

  Object.assign(data, extraFields);

  const yamlStr = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  return `---\n${yamlStr}---\n`;
}

function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
