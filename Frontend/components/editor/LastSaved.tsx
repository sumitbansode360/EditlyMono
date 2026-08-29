// src/components/editor/LastSaved.tsx
interface Props { lastSaved: Date | null; isSaving: boolean; }

export default function LastSaved({ lastSaved, isSaving }: Props) {
  if (isSaving) return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (!lastSaved) return <span className="text-xs text-muted-foreground">Press Ctrl+S to save</span>;
  return (
    <span className="text-xs text-muted-foreground">
      Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}