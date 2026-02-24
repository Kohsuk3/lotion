import type { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import { withRetry } from "../notion/client.js";
import { logger } from "../utils/logger.js";

// ──────────────────────────────────────────────
// Rich text → plain markdown string
// ──────────────────────────────────────────────

function richTextToMarkdown(items: RichTextItemResponse[]): string {
  return items.map((item) => {
    let text = item.plain_text;
    const a = item.annotations;

    if (a.code) text = `\`${text}\``;
    if (a.bold) text = `**${text}**`;
    if (a.italic) text = `_${text}_`;
    if (a.strikethrough) text = `~~${text}~~`;

    if (item.href) text = `[${text}](${item.href})`;
    return text;
  }).join("");
}

// ──────────────────────────────────────────────
// Fetch all blocks (paginated + recursive)
// ──────────────────────────────────────────────

async function fetchBlocks(client: Client, blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await withRetry(() =>
      client.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 })
    );

    for (const block of response.results) {
      if ("type" in block) {
        const b = block as BlockObjectResponse;
        if (b.has_children) {
          (b as BlockObjectResponse & { _children?: BlockObjectResponse[] })._children =
            await fetchBlocks(client, b.id);
        }
        blocks.push(b);
      }
    }

    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }

  return blocks;
}

// ──────────────────────────────────────────────
// Block → Markdown
// ──────────────────────────────────────────────

type BlockWithChildren = BlockObjectResponse & { _children?: BlockWithChildren[] };

function blocksToMarkdown(blocks: BlockWithChildren[], depth = 0): string {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  for (const block of blocks) {
    const children = block._children ?? [];
    const md = blockToMarkdown(block, indent, depth);
    if (md !== null) lines.push(md);

    if (children.length > 0 && block.type !== "table") {
      lines.push(blocksToMarkdown(children, depth + 1));
    }
  }

  return lines.filter((l) => l !== "").join("\n");
}

function blockToMarkdown(block: BlockWithChildren, indent: string, depth: number): string | null {
  const children = block._children ?? [];

  switch (block.type) {
    case "paragraph": {
      const text = richTextToMarkdown(block.paragraph.rich_text);
      return text ? `${indent}${text}` : "";
    }

    case "heading_1":
      return `# ${richTextToMarkdown(block.heading_1.rich_text)}`;

    case "heading_2":
      return `## ${richTextToMarkdown(block.heading_2.rich_text)}`;

    case "heading_3":
      return `### ${richTextToMarkdown(block.heading_3.rich_text)}`;

    case "bulleted_list_item": {
      const text = richTextToMarkdown(block.bulleted_list_item.rich_text);
      const childMd = children.length ? "\n" + blocksToMarkdown(children, depth + 1) : "";
      return `${indent}- ${text}${childMd}`;
    }

    case "numbered_list_item": {
      const text = richTextToMarkdown(block.numbered_list_item.rich_text);
      const childMd = children.length ? "\n" + blocksToMarkdown(children, depth + 1) : "";
      return `${indent}1. ${text}${childMd}`;
    }

    case "to_do": {
      const check = block.to_do.checked ? "[x]" : "[ ]";
      const text = richTextToMarkdown(block.to_do.rich_text);
      return `${indent}- ${check} ${text}`;
    }

    case "toggle": {
      const text = richTextToMarkdown(block.toggle.rich_text);
      const childMd = children.length ? "\n" + blocksToMarkdown(children, depth + 1) : "";
      return `${indent}**${text}**${childMd}`;
    }

    case "quote": {
      const text = richTextToMarkdown(block.quote.rich_text);
      const childMd = children.length ? "\n" + blocksToMarkdown(children, depth + 1) : "";
      return `${indent}> ${text}${childMd}`;
    }

    case "callout": {
      const emoji =
        block.callout.icon?.type === "emoji" ? block.callout.icon.emoji + " " : "";
      const text = richTextToMarkdown(block.callout.rich_text);
      return `${indent}> ${emoji}${text}`;
    }

    case "code": {
      const lang = block.code.language ?? "";
      const text = richTextToMarkdown(block.code.rich_text);
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }

    case "divider":
      return "---";

    case "equation":
      return `$$${block.equation.expression}$$`;

    case "image": {
      const url =
        block.image.type === "external"
          ? block.image.external.url
          : block.image.file.url;
      const caption = block.image.caption.length
        ? richTextToMarkdown(block.image.caption)
        : "image";
      return `${indent}![${caption}](${url})`;
    }

    case "video": {
      const url =
        block.video.type === "external"
          ? block.video.external.url
          : block.video.file.url;
      return `${indent}[video](${url})`;
    }

    case "file": {
      const url =
        block.file.type === "external"
          ? block.file.external.url
          : block.file.file.url;
      const name = block.file.name ?? "file";
      return `${indent}[${name}](${url})`;
    }

    case "pdf": {
      const url =
        block.pdf.type === "external"
          ? block.pdf.external.url
          : block.pdf.file.url;
      return `${indent}[PDF](${url})`;
    }

    case "bookmark":
      return `${indent}[${block.bookmark.url}](${block.bookmark.url})`;

    case "embed":
      return `${indent}[${block.embed.url}](${block.embed.url})`;

    case "link_preview":
      return `${indent}[${block.link_preview.url}](${block.link_preview.url})`;

    case "child_page":
      return `${indent}_📄 ${block.child_page.title}_`;

    case "child_database":
      return `${indent}_🗄️ ${block.child_database.title}_`;

    case "table": {
      const rows = (children as BlockWithChildren[]).filter((c) => c.type === "table_row");
      if (rows.length === 0) return null;
      return tableToMarkdown(rows, block.table.has_column_header);
    }

    case "table_row":
      return null; // handled by parent table block

    case "column_list":
      return children.length ? blocksToMarkdown(children, depth) : null;

    case "column":
      return children.length ? blocksToMarkdown(children, depth) : null;

    case "breadcrumb":
    case "table_of_contents":
      return null;

    case "synced_block":
      return children.length ? blocksToMarkdown(children, depth) : null;

    case "template":
      return null;

    case "link_to_page":
      return null;

    case "unsupported":
      return null;

    default:
      return null;
  }
}

function tableToMarkdown(rows: BlockWithChildren[], hasHeader: boolean): string {
  const parsed = rows.map((row) => {
    if (row.type !== "table_row") return [];
    return row.table_row.cells.map((cell) => richTextToMarkdown(cell));
  });

  if (parsed.length === 0) return "";

  const colCount = Math.max(...parsed.map((r) => r.length));
  const pad = (s: string) => ` ${s} `;

  const lines: string[] = [];
  const renderRow = (cells: string[]) =>
    "|" + Array.from({ length: colCount }, (_, i) => pad(cells[i] ?? "")).join("|") + "|";

  if (hasHeader && parsed.length > 0) {
    lines.push(renderRow(parsed[0]));
    lines.push("|" + Array(colCount).fill(" --- ").join("|") + "|");
    lines.push(...parsed.slice(1).map(renderRow));
  } else {
    lines.push(...parsed.map(renderRow));
  }

  return lines.join("\n");
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export async function pageBodyToMarkdown(client: Client, pageId: string): Promise<string> {
  try {
    const blocks = await fetchBlocks(client, pageId);
    return blocksToMarkdown(blocks);
  } catch (err) {
    logger.warn(`Failed to convert page body for ${pageId}: ${err instanceof Error ? err.message : err}`);
    return "";
  }
}
