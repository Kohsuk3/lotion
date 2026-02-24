import { describe, test, expect } from "bun:test";
import { serializeProperty, extractTitle } from "../../src/converter/properties";

function makeProp(type: string, value: Record<string, unknown>) {
  return { type, ...value } as any;
}

describe("serializeProperty", () => {
  test("title", () => {
    const prop = makeProp("title", {
      title: [{ plain_text: "Hello" }, { plain_text: " World" }],
    });
    expect(serializeProperty(prop)).toBe("Hello World");
  });

  test("rich_text", () => {
    const prop = makeProp("rich_text", {
      rich_text: [{ plain_text: "some " }, { plain_text: "text" }],
    });
    expect(serializeProperty(prop)).toBe("some text");
  });

  test("select あり", () => {
    const prop = makeProp("select", { select: { name: "Option A" } });
    expect(serializeProperty(prop)).toBe("Option A");
  });

  test("select null", () => {
    const prop = makeProp("select", { select: null });
    expect(serializeProperty(prop)).toBeNull();
  });

  test("status あり", () => {
    const prop = makeProp("status", { status: { name: "Done" } });
    expect(serializeProperty(prop)).toBe("Done");
  });

  test("status null", () => {
    const prop = makeProp("status", { status: null });
    expect(serializeProperty(prop)).toBeNull();
  });

  test("multi_select", () => {
    const prop = makeProp("multi_select", {
      multi_select: [{ name: "A" }, { name: "B" }],
    });
    expect(serializeProperty(prop)).toEqual(["A", "B"]);
  });

  test("date: start のみ", () => {
    const prop = makeProp("date", { date: { start: "2024-01-01" } });
    expect(serializeProperty(prop)).toBe("2024-01-01");
  });

  test("date: start + end", () => {
    const prop = makeProp("date", {
      date: { start: "2024-01-01", end: "2024-01-31" },
    });
    expect(serializeProperty(prop)).toEqual({
      start: "2024-01-01",
      end: "2024-01-31",
    });
  });

  test("date null", () => {
    const prop = makeProp("date", { date: null });
    expect(serializeProperty(prop)).toBeNull();
  });

  test("checkbox", () => {
    expect(serializeProperty(makeProp("checkbox", { checkbox: true }))).toBe(true);
    expect(serializeProperty(makeProp("checkbox", { checkbox: false }))).toBe(false);
  });

  test("number", () => {
    expect(serializeProperty(makeProp("number", { number: 42 }))).toBe(42);
    expect(serializeProperty(makeProp("number", { number: null }))).toBeNull();
  });

  test("people (name あり)", () => {
    const prop = makeProp("people", {
      people: [{ name: "Alice", id: "p1" }],
    });
    expect(serializeProperty(prop)).toEqual(["Alice"]);
  });

  test("people (name なし)", () => {
    const prop = makeProp("people", {
      people: [{ id: "p1" }],
    });
    expect(serializeProperty(prop)).toEqual(["p1"]);
  });

  test("relation", () => {
    const prop = makeProp("relation", {
      relation: [{ id: "r1" }, { id: "r2" }],
    });
    expect(serializeProperty(prop)).toEqual(["r1", "r2"]);
  });

  test("files (external + file)", () => {
    const prop = makeProp("files", {
      files: [
        { type: "external", external: { url: "https://example.com/a.png" } },
        { type: "file", file: { url: "https://s3.example.com/b.png" } },
      ],
    });
    expect(serializeProperty(prop)).toEqual([
      "https://example.com/a.png",
      "https://s3.example.com/b.png",
    ]);
  });

  test("url", () => {
    expect(serializeProperty(makeProp("url", { url: "https://example.com" }))).toBe(
      "https://example.com"
    );
  });

  test("email", () => {
    expect(serializeProperty(makeProp("email", { email: "a@b.com" }))).toBe("a@b.com");
  });

  test("phone_number", () => {
    expect(serializeProperty(makeProp("phone_number", { phone_number: "123" }))).toBe("123");
  });

  test("formula (string)", () => {
    const prop = makeProp("formula", {
      formula: { type: "string", string: "computed" },
    });
    expect(serializeProperty(prop)).toBe("computed");
  });

  test("formula (number)", () => {
    const prop = makeProp("formula", {
      formula: { type: "number", number: 99 },
    });
    expect(serializeProperty(prop)).toBe(99);
  });

  test("formula (boolean)", () => {
    const prop = makeProp("formula", {
      formula: { type: "boolean", boolean: true },
    });
    expect(serializeProperty(prop)).toBe(true);
  });

  test("formula (date)", () => {
    const prop = makeProp("formula", {
      formula: { type: "date", date: { start: "2024-06-01" } },
    });
    expect(serializeProperty(prop)).toBe("2024-06-01");
  });

  test("rollup (number)", () => {
    const prop = makeProp("rollup", {
      rollup: { type: "number", number: 10 },
    });
    expect(serializeProperty(prop)).toBe(10);
  });

  test("rollup (date)", () => {
    const prop = makeProp("rollup", {
      rollup: { type: "date", date: { start: "2024-01-01" } },
    });
    expect(serializeProperty(prop)).toBe("2024-01-01");
  });

  test("rollup (array)", () => {
    const prop = makeProp("rollup", {
      rollup: {
        type: "array",
        array: [
          { type: "number", number: 1 },
          { type: "number", number: 2 },
        ],
      },
    });
    expect(serializeProperty(prop)).toEqual([1, 2]);
  });

  test("created_time", () => {
    expect(
      serializeProperty(makeProp("created_time", { created_time: "2024-01-01T00:00:00.000Z" }))
    ).toBe("2024-01-01T00:00:00.000Z");
  });

  test("last_edited_time", () => {
    expect(
      serializeProperty(
        makeProp("last_edited_time", { last_edited_time: "2024-06-01T12:00:00.000Z" })
      )
    ).toBe("2024-06-01T12:00:00.000Z");
  });

  test("created_by (name あり)", () => {
    const prop = makeProp("created_by", {
      created_by: { name: "Alice", id: "u1" },
    });
    expect(serializeProperty(prop)).toBe("Alice");
  });

  test("created_by (name なし)", () => {
    const prop = makeProp("created_by", {
      created_by: { id: "u1" },
    });
    expect(serializeProperty(prop)).toBe("u1");
  });

  test("unique_id (prefix あり)", () => {
    const prop = makeProp("unique_id", {
      unique_id: { prefix: "PROJ", number: 42 },
    });
    expect(serializeProperty(prop)).toBe("PROJ-42");
  });

  test("unique_id (prefix なし)", () => {
    const prop = makeProp("unique_id", {
      unique_id: { prefix: null, number: 7 },
    });
    expect(serializeProperty(prop)).toBe(7);
  });

  test("verification", () => {
    const prop = makeProp("verification", {
      verification: { state: "verified" },
    });
    expect(serializeProperty(prop)).toBe("verified");
  });

  test("verification null", () => {
    const prop = makeProp("verification", { verification: null });
    expect(serializeProperty(prop)).toBeNull();
  });

  test("unknown type は null", () => {
    expect(serializeProperty(makeProp("something_new", {}))).toBeNull();
  });
});

describe("extractTitle", () => {
  test("title プロパティからタイトルを抽出", () => {
    const props = {
      Name: { type: "title", title: [{ plain_text: "My Page" }] },
      Tags: { type: "multi_select", multi_select: [] },
    } as any;
    expect(extractTitle(props)).toBe("My Page");
  });

  test("title プロパティがなければ空文字", () => {
    const props = {
      Status: { type: "select", select: { name: "Done" } },
    } as any;
    expect(extractTitle(props)).toBe("");
  });

  test("title の前後空白をトリム", () => {
    const props = {
      Title: { type: "title", title: [{ plain_text: "  spaced  " }] },
    } as any;
    expect(extractTitle(props)).toBe("spaced");
  });
});
