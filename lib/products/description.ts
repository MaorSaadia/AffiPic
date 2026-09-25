// Existing plain text and version-1 Markdown remain readable without rewriting rows.
export const DESCRIPTION_PREFIX = "affipic:description:v1\n";
export const DOCUMENT_PREFIX = "affipic:description:v2\n";
export type DescriptionNode = {
  type: string;
  text?: string;
  content?: DescriptionNode[];
  marks?: { type: string }[];
  attrs?: { level?: number; start?: number };
};
export const descriptionSource = (value: string) =>
  value.startsWith(DESCRIPTION_PREFIX)
    ? value.slice(DESCRIPTION_PREFIX.length)
    : value;
export const formattedDescription = (value: string) =>
  DESCRIPTION_PREFIX + value.slice(0, 5000 - DESCRIPTION_PREFIX.length);
const kinds: Record<string, string> = {
  doc: "d",
  paragraph: "p",
  heading: "h",
  bulletList: "u",
  orderedList: "o",
  listItem: "l",
  hardBreak: "b",
  text: "t",
};
function pack(node: DescriptionNode): unknown {
  if (node.type === "text")
    return [
      "t",
      node.text ?? "",
      (node.marks?.some((m) => m.type === "bold") ? 1 : 0) +
        (node.marks?.some((m) => m.type === "italic") ? 2 : 0),
    ];
  return [
    kinds[node.type] ?? "p",
    (node.content ?? []).map(pack),
    ...(node.type === "orderedList" ? [node.attrs?.start ?? 1] : []),
  ];
}
function unpack(raw: unknown, depth = 0): DescriptionNode {
  if (depth > 20 || !Array.isArray(raw) || typeof raw[0] !== "string")
    throw new Error("Invalid document");
  const type = Object.keys(kinds).find((k) => kinds[k] === raw[0]);
  if (!type) throw new Error("Invalid node");
  if (type === "text") {
    if (
      typeof raw[1] !== "string" ||
      !Number.isInteger(raw[2]) ||
      raw[2] < 0 ||
      raw[2] > 3
    )
      throw new Error("Invalid text");
    return {
      type,
      text: raw[1],
      marks: [
        ...(raw[2] & 1 ? [{ type: "bold" }] : []),
        ...(raw[2] & 2 ? [{ type: "italic" }] : []),
      ],
    };
  }
  if (!Array.isArray(raw[1])) throw new Error("Invalid children");
  return {
    type,
    content: raw[1].map((child) => unpack(child, depth + 1)),
    ...(type === "heading" ? { attrs: { level: 3 } } : {}),
    ...(type === "orderedList"
      ? {
          attrs: {
            start:
              Number.isInteger(raw[2]) && raw[2] > 0 && raw[2] < 10000
                ? raw[2]
                : 1,
          },
        }
      : {}),
  };
}
export function serializeDescription(doc: DescriptionNode): string {
  // Plain paragraphs keep the original 5,000-character capacity and literal punctuation.
  if (
    doc.content?.every(
      (n) =>
        n.type === "paragraph" &&
        (n.content ?? []).every((c) => c.type === "text" && !c.marks?.length),
    )
  ) {
    const plain = doc.content
      .map((n) => (n.content ?? []).map((c) => c.text ?? "").join(""))
      .join("\n");
    if (
      !plain.startsWith(DESCRIPTION_PREFIX) &&
      !plain.startsWith(DOCUMENT_PREFIX)
    )
      return plain;
  }
  return DOCUMENT_PREFIX + JSON.stringify(pack(doc));
}
function inline(value: string): DescriptionNode[] {
  return value
    .split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)
    .filter(Boolean)
    .map((text) => {
      if (text.startsWith("**") && text.endsWith("**"))
        return {
          type: "text",
          text: text.slice(2, -2),
          marks: [{ type: "bold" }],
        };
      if (text.startsWith("*") && text.endsWith("*"))
        return {
          type: "text",
          text: text.slice(1, -1),
          marks: [{ type: "italic" }],
        };
      return { type: "text", text };
    });
}
export function descriptionDocument(value: string): DescriptionNode {
  if (value.startsWith(DOCUMENT_PREFIX)) {
    try {
      const node = unpack(JSON.parse(value.slice(DOCUMENT_PREFIX.length)));
      if (node.type === "doc") return node;
    } catch {
      /* Corrupt/unknown documents remain readable as literal text. */
    }
  }
  if (!value.startsWith(DESCRIPTION_PREFIX))
    return {
      type: "doc",
      content: value
        .split(/\r?\n/)
        .map((text) => ({
          type: "paragraph",
          content: text ? [{ type: "text", text }] : [],
        })),
    };
  const lines = descriptionSource(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\*\*([-*]|\d+\.) (.+)\*\*$/, "$1 **$2**"));
  const content: DescriptionNode[] = [];
  for (let i = 0; i < lines.length;) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    if (/^#{1,3} /.test(lines[i])) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: inline(lines[i++].replace(/^#{1,3} /, "")),
      });
      continue;
    }
    const ordered = /^\d+\. /.test(lines[i]);
    if (ordered || /^[-*] /.test(lines[i])) {
      const items: DescriptionNode[] = [];
      const pattern = ordered ? /^\d+\. / : /^[-*] /;
      while (i < lines.length && pattern.test(lines[i]))
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: inline(lines[i++].replace(pattern, "")),
            },
          ],
        });
      content.push({
        type: ordered ? "orderedList" : "bulletList",
        content: items,
      });
      continue;
    }
    const paragraph = [lines[i++]];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(?:#{1,3} |[-*] |\d+\. )/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    content.push({ type: "paragraph", content: inline(paragraph.join("\n")) });
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
export function descriptionExcerpt(value: string, max = 180) {
  function text(node: DescriptionNode): string {
    return node.type === "text"
      ? (node.text ?? "")
      : (node.content ?? [])
          .map(text)
          .join(["paragraph", "heading"].includes(node.type) ? "" : " ");
  }
  const compact = text(descriptionDocument(value)).replace(/\s+/g, " ").trim();
  return compact.length > max ? compact.slice(0, max - 1) + "?" : compact;
}
