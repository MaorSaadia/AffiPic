"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import {
  descriptionDocument,
  serializeDescription,
  type DescriptionNode,
} from "@/lib/products/description";
export function DescriptionEditor({
  id,
  value,
  onChange,
  name,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
}) {
  const current = useRef(value);
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
        underline: false,
        heading: { levels: [3] },
      }),
    ],
    content: descriptionDocument(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": name ? "Description (optional)" : "Edit suggestion",
        class: "description-copy visual-description",
      },
    },
    onUpdate: ({ editor }) => {
      const next = serializeDescription(editor.getJSON() as DescriptionNode);
      if (next.length > 5000) {
        setError(
          "This description exceeds the storage limit. Shorten the text or use less formatting.",
        );
        editor.commands.setContent(descriptionDocument(current.current), {
          emitUpdate: false,
        });
        return;
      }
      setError("");
      current.current = next;
      onChange(next);
    },
  });
  useEffect(() => {
    if (editor && value !== current.current) {
      current.current = value;
      editor.commands.setContent(descriptionDocument(value), {
        emitUpdate: false,
      });
    }
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  const buttons = [
    {
      label: "Bold",
      active: editor?.isActive("bold"),
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      active: editor?.isActive("italic"),
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Subheading",
      active: editor?.isActive("heading"),
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bullet list",
      active: editor?.isActive("bulletList"),
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      active: editor?.isActive("orderedList"),
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];
  return (
    <div className="description-editor">
      {name && <input type="hidden" name={name} value={value} />}
      <div
        className="description-toolbar"
        role="toolbar"
        aria-label="Description formatting"
      >
        {buttons.map((button) => (
          <Button
            type="button"
            key={button.label}
            variant="ghost"
            disabled={!editor || disabled}
            aria-pressed={!!button.active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={button.run}
          >
            {button.label}
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
      {error && <p role="alert">{error}</p>}
      <p className="field-hint">
        Select text to format it. What you see here is how the description is
        formatted on your website.
      </p>
    </div>
  );
}
