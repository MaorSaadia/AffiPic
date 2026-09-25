import { Fragment, type ReactNode } from "react";
import {
  descriptionDocument,
  type DescriptionNode,
} from "@/lib/products/description";
function render(node: DescriptionNode, key: number): ReactNode {
  if (node.type === "text") {
    let text: ReactNode = node.text;
    if (node.marks?.some((m) => m.type === "bold"))
      text = <strong>{text}</strong>;
    if (node.marks?.some((m) => m.type === "italic")) text = <em>{text}</em>;
    return <Fragment key={key}>{text}</Fragment>;
  }
  const children = node.content?.map(render);
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{children?.length ? children : <br />}</p>;
    case "heading":
      return <h3 key={key}>{children?.length ? children : <br />}</h3>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start ?? 1}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}
// Never interpret HTML or arbitrary element/attribute names from stored or AI content.
export function DescriptionView({ value }: { value: string }) {
  return (
    <div className="description-copy">
      {descriptionDocument(value).content?.map(render)}
    </div>
  );
}
