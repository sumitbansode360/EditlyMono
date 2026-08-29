// src/components/editor/EditorCanvas.tsx
"use client";

import { Editor, EditorContent } from "@tiptap/react";

interface Props { editor: Editor | null; }

export default function EditorCanvas({ editor }: Props) {
  // PaginationPlus owns the page width/margins itself — it sets width,
  // padding, and a border directly on the `.tiptap` element (see
  // globals.css for the paper background). This wrapper just needs to
  // scroll; it shouldn't also apply width/padding/background, or the
  // page would get double-inset.
  return (
    <div className="flex-1 overflow-auto bg-[#f0f4f8] px-2 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto w-fit">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}