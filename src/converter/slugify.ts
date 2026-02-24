const ASCII_RE = /^[\x00-\x7F]*$/;

export function slugify(title: string, notionId: string): string {
  if (!title.trim()) {
    return `${notionId.slice(0, 8)}.md`;
  }

  if (ASCII_RE.test(title)) {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || notionId.slice(0, 8)
    ) + ".md";
  }

  // Non-ASCII (Japanese etc): use as-is with basic sanitization
  const sanitized = title.trim()
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\.{2,}/g, ".");
  return `${sanitized}.md`;
}

export function resolveSlugConflict(slug: string, notionId: string): string {
  const ext = ".md";
  const base = slug.endsWith(ext) ? slug.slice(0, -ext.length) : slug;
  return `${base}-${notionId.slice(0, 4)}${ext}`;
}
