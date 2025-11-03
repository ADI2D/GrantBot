import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CornerDownLeft,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ToolbarProps = {
  editor: Editor | null;
};

const extensionMap = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  bulletList: "bulletList",
  orderedList: "orderedList",
  blockquote: "blockquote",
  heading: "heading",
  paragraph: "paragraph",
  textAlign: "textAlign",
  listItem: "listItem",
  fontFamily: "fontFamily",
  textStyle: "textStyle",
} as const;

function ToolbarToggle({
  onClick,
  active,
  disabled,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 w-8 rounded-lg p-0 transition-colors",
        active
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-600",
      )}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export function RichTextToolbar({ editor }: ToolbarProps) {
  if (!editor) {
    return null;
  }

  const availableExtensions = new Set(editor.extensionManager.extensions.map((ext) => ext.name));
  const hasExtension = (key: keyof typeof extensionMap) => availableExtensions.has(extensionMap[key]);

  const canSink = editor.can().sinkListItem("listItem");
  const canLift = editor.can().liftListItem("listItem");

  const headingLevels = [1, 2, 3, 4];
  const currentHeading = headingLevels.find((level) => editor.isActive("heading", { level })) ?? 0;

  return (
    <div className="sticky top-[72px] z-30 mb-4 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="flex flex-wrap items-center gap-2">
        {hasExtension("fontFamily") ? (
          <select
            value={editor.getAttributes("textStyle").fontFamily ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const chain = editor.chain().focus();
              if (value) {
                chain.setFontFamily(value).run();
              } else {
                chain.unsetFontFamily().run();
              }
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 shadow-xs focus:border-blue-400 focus:outline-none"
          >
            <option value="">Font</option>
            <option value='"Montserrat",sans-serif'>Montserrat</option>
            <option value='"Merriweather",serif'>Merriweather</option>
            <option value='"Inter",sans-serif'>Inter</option>
            <option value='"Playfair Display",serif'>Playfair</option>
          </select>
        ) : null}

        {hasExtension("textStyle") ? (
          <select
            value={editor.getAttributes("textStyle").fontSize ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(value).run();
              }
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 shadow-xs focus:border-blue-400 focus:outline-none"
          >
            <option value="">Size</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
          </select>
        ) : null}

        {hasExtension("heading") ? (
          <select
            value={currentHeading}
            onChange={(event) => {
              const level = Number(event.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
                return;
              }
              editor.chain().focus().toggleHeading({ level }).run();
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600 shadow-xs focus:border-blue-400 focus:outline-none"
          >
            <option value={0}>Paragraph</option>
            {headingLevels.map((level) => (
              <option key={level} value={level}>{`Heading ${level}`}</option>
            ))}
          </select>
        ) : null}

        {hasExtension("bold") ? (
          <ToolbarToggle
            icon={Bold}
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
        ) : null}

        {hasExtension("italic") ? (
          <ToolbarToggle
            icon={Italic}
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
        ) : null}

        {hasExtension("underline") ? (
          <ToolbarToggle
            icon={Underline}
            label="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
        ) : null}

        {hasExtension("bulletList") ? (
          <ToolbarToggle
            icon={List}
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
        ) : null}

        {hasExtension("orderedList") ? (
          <ToolbarToggle
            icon={ListOrdered}
            label="Ordered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        ) : null}

        {hasExtension("listItem") ? (
          <>
            <ToolbarToggle
              icon={CornerDownLeft}
              label="Outdent"
              disabled={!canLift}
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
            />
            <ToolbarToggle
              icon={CornerDownRight}
              label="Indent"
              disabled={!canSink}
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
            />
          </>
        ) : null}

        {hasExtension("blockquote") ? (
          <ToolbarToggle
            icon={Quote}
            label="Block quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
        ) : null}

        {hasExtension("textAlign") ? (
          <div className="flex items-center gap-1">
            <ToolbarToggle
              icon={AlignLeft}
              label="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            />
            <ToolbarToggle
              icon={AlignCenter}
              label="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            />
            <ToolbarToggle
              icon={AlignRight}
              label="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
