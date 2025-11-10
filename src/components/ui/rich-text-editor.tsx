"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { start: number; end: number; text: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCommentButton?: boolean;
  onComment?: (selection: { start: number; end: number; text: string }) => void;
};

type FormatCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "formatBlock" | "justifyLeft" | "justifyCenter" | "justifyRight" | "undo" | "redo";

export function RichTextEditor({
  value,
  onChange,
  onSelectionChange,
  placeholder = "Start typing...",
  disabled = false,
  className,
  showCommentButton = false,
  onComment,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{start: number; end: number; text: string} | null>(null);

  // Initialize editor with value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setHasSelection(false);
      setSelectionRange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    const hasText = selectedText.length > 0;

    setHasSelection(hasText);

    if (hasText) {
      // Calculate character offset within editor
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(editorRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      const end = start + selectedText.length;

      const selectionData = { start, end, text: selectedText };
      setSelectionRange(selectionData);

      if (onSelectionChange) {
        onSelectionChange(selectionData);
      }
    } else {
      setSelectionRange(null);
    }
  }, [onSelectionChange]);

  // Add selection change listener
  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: FormatCommand, value: string | null = null) => {
    if (disabled) return;

    document.execCommand(command, false, value || undefined);
    editorRef.current?.focus();
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleComment = () => {
    if (selectionRange && onComment) {
      onComment(selectionRange);
    }
  };

  const toolbarButtons: Array<{
    icon: React.ComponentType<{ className?: string }>;
    command: FormatCommand;
    value?: string;
    label: string;
  }> = [
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { icon: Underline, command: "underline", label: "Underline" },
    { icon: List, command: "insertUnorderedList", label: "Bullet List" },
    { icon: ListOrdered, command: "insertOrderedList", label: "Numbered List" },
    { icon: Quote, command: "formatBlock", value: "blockquote", label: "Quote" },
    { icon: Type, command: "formatBlock", value: "h3", label: "Heading" },
    { icon: AlignLeft, command: "justifyLeft", label: "Align Left" },
    { icon: AlignCenter, command: "justifyCenter", label: "Align Center" },
    { icon: AlignRight, command: "justifyRight", label: "Align Right" },
    { icon: Undo, command: "undo", label: "Undo" },
    { icon: Redo, command: "redo", label: "Redo" },
  ];

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {toolbarButtons.map((button, index) => {
          const Icon = button.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => execCommand(button.command, button.value)}
              disabled={disabled}
              className={cn(
                "rounded p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
              )}
              title={button.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        {showCommentButton && (
          <>
            <div className="mx-1 h-6 w-px bg-slate-300" />
            <button
              type="button"
              onClick={handleComment}
              disabled={disabled || !hasSelection}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                hasSelection
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "text-slate-400 cursor-not-allowed opacity-50"
              )}
              title="Add comment to selection"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comment
            </button>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        className={cn(
          "min-h-[300px] p-4 text-sm text-slate-900 focus:outline-none",
          "prose prose-sm max-w-none",
          disabled && "cursor-not-allowed opacity-60 bg-slate-50",
        )}
        data-placeholder={placeholder}
        style={{
          // Placeholder styling
          ...(!editorRef.current?.textContent && {
            position: "relative",
          }),
        }}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }

        /* Rich text styling */
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
        }

        [contenteditable] blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 1rem;
          color: #64748b;
          font-style: italic;
          margin: 1rem 0;
        }

        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        [contenteditable] li {
          margin: 0.25rem 0;
        }

        [contenteditable] p {
          margin: 0.5rem 0;
        }

        [contenteditable] strong {
          font-weight: 600;
        }

        [contenteditable] em {
          font-style: italic;
        }

        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
