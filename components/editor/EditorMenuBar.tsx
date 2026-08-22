// src/components/editor/EditorMenuBar.tsx
"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListTodo,
  Undo, Redo, Highlighter, Quote, Minus, Code,
} from "lucide-react";

interface Props { editor: Editor | null; }

const FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];

const HEADING_OPTIONS = [
  { label: "Normal text", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Heading 4", value: "h4" },
];

function TB({
  onClick, active, disabled, tip, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; tip: string; children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={active}
            onPressedChange={onClick}
            disabled={disabled}
            className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground disabled:opacity-40"
          >
            {children}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EditorMenuBar({ editor }: Props) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor || ctx.editor.isDestroyed) return null;
      const e = ctx.editor;
      return {
        // Inline marks
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isStrike: e.isActive("strike"),
        isCode: e.isActive("code"),
        isHighlight: e.isActive("highlight"),
        // Alignment
        isAlignLeft: e.isActive({ textAlign: "left" }),
        isAlignCenter: e.isActive({ textAlign: "center" }),
        isAlignRight: e.isActive({ textAlign: "right" }),
        isAlignJustify: e.isActive({ textAlign: "justify" }),
        // Lists
        isBulletList: e.isActive("bulletList"),
        isOrderedList: e.isActive("orderedList"),
        isTaskList: e.isActive("taskList"),
        // Block types
        isBlockquote: e.isActive("blockquote"),
        // Heading / paragraph
        headingValue: (() => {
          for (const level of [1, 2, 3, 4] as const) {
            if (e.isActive("heading", { level })) return `h${level}`;
          }
          return "paragraph";
        })(),
        // Font size — read from textStyle mark on current selection
        fontSize: e.getAttributes("textStyle")?.fontSize ?? "12",
        // Undo/redo availability. `undoRedo: false` on StarterKit means no
        // history extension registers these commands on either the plain
        // or the live (Yjs) editor instance right now, so `.undo`/`.redo`
        // can be undefined — and briefly *is* undefined during the
        // plain-mode -> live-mode editor swap even once a real history
        // extension is wired in. Guard rather than assume the command
        // exists.
        canUndo: e.can().undo?.() ?? false,
        canRedo: e.can().redo?.() ?? false,
      };
    },
  });

  if (!editor || !editorState) return null;

  // Radix's Select closes itself and returns focus to its own trigger
  const setHeading = (value: string) => {
    requestAnimationFrame(() => {
      if (value === "paragraph") {
        editor.chain().focus().setParagraph().run();
      } else {
        const level = parseInt(value[1]) as 1 | 2 | 3 | 4;
        editor.chain().focus().setHeading({ level }).run();
      }
    });
  };

  const onFontSize = (size: string) => {
    requestAnimationFrame(() => {
      editor.chain().focus().setFontSize(size).run();
    });
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto flex-wrap">
      {/* Undo / Redo */}
      <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo} tip="Undo (Ctrl+Z)">
        <Undo className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo} tip="Redo (Ctrl+Y)">
        <Redo className="w-3.5 h-3.5" />
      </TB>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Heading / paragraph select */}
      <Select value={editorState.headingValue} onValueChange={setHeading}>
        <SelectTrigger className="h-7 w-36 text-xs border-none shadow-none bg-transparent hover:bg-accent focus:ring-0 gap-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
          {HEADING_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Font size — reads live from editorState.fontSize */}
      <Select value={String(editorState.fontSize)} onValueChange={onFontSize}>
        <SelectTrigger className="h-7 w-16 text-xs border-none shadow-none bg-transparent hover:bg-accent focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
          {FONT_SIZES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Inline formatting — active state from editorState snapshot */}
      <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editorState.isBold} tip="Bold (Ctrl+B)">
        <Bold className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editorState.isItalic} tip="Italic (Ctrl+I)">
        <Italic className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editorState.isUnderline} tip="Underline (Ctrl+U)">
        <Underline className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editorState.isStrike} tip="Strikethrough">
        <Strikethrough className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleCode().run()} active={editorState.isCode} tip="Inline code">
        <Code className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleHighlight().run()} active={editorState.isHighlight} tip="Highlight">
        <Highlighter className="w-3.5 h-3.5" />
      </TB>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alignment */}
      <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editorState.isAlignLeft} tip="Left">
        <AlignLeft className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editorState.isAlignCenter} tip="Center">
        <AlignCenter className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editorState.isAlignRight} tip="Right">
        <AlignRight className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editorState.isAlignJustify} tip="Justify">
        <AlignJustify className="w-3.5 h-3.5" />
      </TB>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Lists */}
      <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editorState.isBulletList} tip="Bullet list">
        <List className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editorState.isOrderedList} tip="Numbered list">
        <ListOrdered className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().toggleTaskList().run()} active={editorState.isTaskList} tip="Task list">
        <ListTodo className="w-3.5 h-3.5" />
      </TB>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Block extras */}
      <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editorState.isBlockquote} tip="Blockquote">
        <Quote className="w-3.5 h-3.5" />
      </TB>
      <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Divider">
        <Minus className="w-3.5 h-3.5" />
      </TB>
    </div>
  );
}