"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export type MentionUser = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
};

type MentionsAutocompleteProps = {
  users: MentionUser[];
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  position: { top: number; left: number };
  query: string;
};

export function MentionsAutocomplete({
  users,
  onSelect,
  onClose,
  position,
  query,
}: MentionsAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selected index when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          onSelect(filteredUsers[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredUsers, onSelect, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filteredUsers.length === 0) {
    return createPortal(
      <div
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
        className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg"
      >
        No users found
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      <div className="max-h-60 overflow-y-auto p-1">
        {filteredUsers.map((user, index) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
              index === selectedIndex
                ? "bg-blue-50 text-blue-900"
                : "text-slate-700 hover:bg-slate-50"
            )}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium">{user.name}</p>
              {user.email && (
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        <kbd className="rounded bg-slate-100 px-1.5 py-0.5">↑</kbd>{" "}
        <kbd className="rounded bg-slate-100 px-1.5 py-0.5">↓</kbd> navigate,{" "}
        <kbd className="rounded bg-slate-100 px-1.5 py-0.5">Enter</kbd> select
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook to manage mentions in a textarea
 */
export function useMentionsInTextarea(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  users: MentionUser[],
  onMention?: (user: MentionUser) => void
) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(0);

  const handleTextChange = useCallback((value: string, cursorPosition: number) => {
    // Find @ symbol before cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      setShowMentions(false);
      return;
    }

    // Check if there's a space between @ and cursor
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
    if (textAfterAt.includes(" ")) {
      setShowMentions(false);
      return;
    }

    // Show mentions autocomplete
    setShowMentions(true);
    setMentionQuery(textAfterAt);
    setMentionStartIndex(lastAtIndex);

    // Calculate position
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();

      // Create a temporary div to measure text position
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.visibility = "hidden";
      div.style.whiteSpace = "pre-wrap";
      div.style.font = window.getComputedStyle(textarea).font;
      div.style.width = `${rect.width}px`;
      div.textContent = textBeforeCursor;
      document.body.appendChild(div);

      const textHeight = div.offsetHeight;
      document.body.removeChild(div);

      setMentionPosition({
        top: rect.top + textHeight + window.scrollY,
        left: rect.left + 10 + window.scrollX,
      });
    }
  }, [textareaRef]);

  const insertMention = useCallback(
    (user: MentionUser) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const value = textarea.value;
      const cursorPosition = textarea.selectionStart;

      // Replace @query with @username
      const before = value.slice(0, mentionStartIndex);
      const after = value.slice(cursorPosition);
      const mention = `@${user.name}`;
      const newValue = before + mention + " " + after;

      textarea.value = newValue;

      // Set cursor after mention
      const newCursorPos = mentionStartIndex + mention.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger change event
      const event = new Event("input", { bubbles: true });
      textarea.dispatchEvent(event);

      setShowMentions(false);

      if (onMention) {
        onMention(user);
      }
    },
    [textareaRef, mentionStartIndex, onMention]
  );

  return {
    showMentions,
    mentionQuery,
    mentionPosition,
    handleTextChange,
    insertMention,
    closeMentions: () => setShowMentions(false),
  };
}
