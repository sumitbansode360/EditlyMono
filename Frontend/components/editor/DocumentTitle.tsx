// src/components/editor/DocumentTitle.tsx
"use client";

import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}

export default function DocumentTitle({ value, onChange, readOnly = false }: Props) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (readOnly) {
    return (
      <span className="text-sm font-medium text-foreground rounded px-1 py-0.5 truncate max-w-[200px]">
        {value}
      </span>
    );
  }

  return editing ? (
    <input
      ref={inputRef}
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
      className={[
        "text-sm font-medium bg-transparent outline-none w-48 px-1 py-0.5 rounded",
        "border border-border focus:border-ring",
        "text-foreground",
      ].join(" ")}
    />
  ) : (
    <span
      onClick={() => setEditing(true)}
      className="text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded px-1 py-0.5 cursor-text truncate max-w-[200px] transition-colors"
    >
      {value}
    </span>
  );
}
