"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { MessageSquare } from "lucide-react";
import { FontSize } from "@/lib/editor/font-size-extension";
import { RichTextToolbar } from "@/components/freelancer/rich-text-toolbar";
import { cn } from "@/lib/utils";

type TipTapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { start: number; end: number; text: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCommentButton?: boolean;
  onComment?: (selection: { start: number; end: number; text: string }) => void;
  showToolbar?: boolean;
};

export function TipTapEditor({
  value,
  onChange,
  onSelectionChange,
  placeholder = "Start typing...",
  disabled = false,
  className,
  showCommentButton = false,
  onComment,
  showToolbar = true,
}: TipTapEditorProps) {
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);

  const toInitialHtml = (content: string) => {
    if (!content) return "<p></p>";
    const trimmed = content.trim();
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    if (looksLikeHtml) {
      return content;
    }
    return `<p>${content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: toInitialHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      handleSelectionChange(editor);
    },
  });

  const handleSelectionChange = useCallback(
    (editor: any) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
      const hasText = selectedText.length > 0;

      setHasSelection(hasText);

      if (hasText) {
        const selectionData = { start: from, end: to, text: selectedText };
        setSelectionRange(selectionData);

        if (onSelectionChange) {
          onSelectionChange(selectionData);
        }
      } else {
        setSelectionRange(null);
      }
    },
    [onSelectionChange]
  );

  useEffect(() => {
    if (editor && disabled && editor.isEditable) {
      editor.setEditable(false);
    } else if (editor && !disabled && !editor.isEditable) {
      editor.setEditable(true);
    }
  }, [editor, disabled]);

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      const currentSelection = editor.state.selection;
      editor.commands.setContent(toInitialHtml(value), false);
      // Restore selection if possible
      if (currentSelection) {
        try {
          editor.commands.setTextSelection(currentSelection);
        } catch (e) {
          // Ignore selection restoration errors
        }
      }
    }
  }, [editor, value]);

  const handleComment = () => {
    if (selectionRange && onComment) {
      onComment(selectionRange);
    }
  };

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      {showToolbar && <RichTextToolbar editor={editor} />}

      {showCommentButton && hasSelection && (
        <div className="sticky top-20 z-40 flex justify-center">
          <button
            type="button"
            onClick={handleComment}
            disabled={disabled || !hasSelection}
            className={cn(
              "mb-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg transition-all",
              hasSelection
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400 opacity-50"
            )}
            title="Add comment to selection"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Add Comment
          </button>
        </div>
      )}

      <div
        className={cn(
          "min-h-[300px]",
          disabled && "cursor-not-allowed opacity-60 bg-slate-50"
        )}
      >
        {editor ? (
          <EditorContent
            editor={editor}
            className="prose prose-slate max-w-none p-4 text-sm focus:outline-none"
          />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
            Loading editor…
          </div>
        )}
      </div>

      <style jsx global>{`
        /* TipTap editor styles */
        .ProseMirror {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          line-height: 1.2;
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          line-height: 1.4;
        }

        .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          line-height: 1.4;
        }

        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .ProseMirror li {
          margin: 0.25rem 0;
        }

        .ProseMirror p {
          margin: 0.5rem 0;
        }

        .ProseMirror strong {
          font-weight: 600;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 1rem;
          color: #64748b;
          font-style: italic;
          margin: 1rem 0;
        }

        /* Selection highlight */
        .ProseMirror ::selection {
          background-color: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
