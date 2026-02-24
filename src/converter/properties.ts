import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

type PropertyValue = PageObjectResponse["properties"][string];

export function serializeProperty(prop: PropertyValue): unknown {
  switch (prop.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("");

    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("");

    case "select":
      return prop.select?.name ?? null;

    case "status":
      return prop.status?.name ?? null;

    case "multi_select":
      return prop.multi_select.map((s) => s.name);

    case "date":
      if (!prop.date) return null;
      return prop.date.end
        ? { start: prop.date.start, end: prop.date.end }
        : prop.date.start;

    case "checkbox":
      return prop.checkbox;

    case "number":
      return prop.number;

    case "people":
      return prop.people.map((p) =>
        "name" in p ? p.name ?? p.id : p.id
      );

    case "relation":
      return prop.relation.map((r) => r.id);

    case "files":
      return prop.files.map((f) => {
        if (f.type === "external") return f.external.url;
        if (f.type === "file") return f.file.url;
        return null;
      }).filter(Boolean);

    case "url":
      return prop.url;

    case "email":
      return prop.email;

    case "phone_number":
      return prop.phone_number;

    case "formula":
      return serializeFormula(prop.formula);

    case "rollup":
      return serializeRollup(prop.rollup);

    case "created_time":
      return prop.created_time;

    case "last_edited_time":
      return prop.last_edited_time;

    case "created_by":
      return "name" in prop.created_by ? prop.created_by.name ?? prop.created_by.id : prop.created_by.id;

    case "last_edited_by":
      return "name" in prop.last_edited_by ? prop.last_edited_by.name ?? prop.last_edited_by.id : prop.last_edited_by.id;

    case "unique_id":
      return prop.unique_id.prefix
        ? `${prop.unique_id.prefix}-${prop.unique_id.number}`
        : prop.unique_id.number;

    case "verification":
      return prop.verification?.state ?? null;

    default:
      return null;
  }
}

function serializeFormula(formula: Extract<PropertyValue, { type: "formula" }>["formula"]): unknown {
  switch (formula.type) {
    case "string": return formula.string;
    case "number": return formula.number;
    case "boolean": return formula.boolean;
    case "date": return formula.date?.start ?? null;
    default: return null;
  }
}

function serializeRollup(rollup: Extract<PropertyValue, { type: "rollup" }>["rollup"]): unknown {
  switch (rollup.type) {
    case "number": return rollup.number;
    case "date": return rollup.date?.start ?? null;
    case "array":
      return rollup.array.map((item) => serializeProperty(item as PropertyValue));
    default: return null;
  }
}

export function extractTitle(properties: PageObjectResponse["properties"]): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === "title") {
      return prop.title.map((t) => t.plain_text).join("").trim();
    }
  }
  return "";
}
