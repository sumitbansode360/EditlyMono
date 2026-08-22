"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { PaginationPlus } from "tiptap-pagination-plus";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import FontSize from "./extensions/FontSize";
import EditorToolbar from "./EditorToolbar";
import EditorCanvas from "./EditorCanvas";
import CollaboratorsSidebar from "./CollaboratorsSidebar";
import ReadOnlyBanner from "./ReadOnlyBanner";
import { useUser } from "@/context/UserContext";
import { getDocument, putDocument } from "@/lib/api/document";
import { useDocumentCollaboration } from "@/hooks/useDocumentCollaboration";
import { CollaborationUser, OnlineUser } from "@/types/collaboration";
import { Document } from "@/types/document";
import { User } from "@/types/auth";

function isTipTapContentEmpty(content: unknown): boolean {
  if (!content || typeof content !== "object") return true;
  if (Object.keys(content as object).length === 0) return true;

  const doc = content as { type?: string; content?: unknown[] };
  return doc.type === "doc" && (!doc.content || doc.content.length === 0);
}

function buildEditorExtensions(
  isLive: boolean,
  ydoc: Y.Doc,
  provider: WebsocketProvider,
  collaborationUser: CollaborationUser
) {
  const base = [
    StarterKit.configure({
      undoRedo: false,
      underline: false,
      heading: { levels: [1, 2, 3, 4] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Underline,
    TextStyle,
    Color,
    FontSize,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({ placeholder: "Start typing your document…" }),
    Typography,
    TaskList,
    TaskItem.configure({ nested: true }),
    // Visual-only pagination: pure ProseMirror decorations (verified from
    // source), so it never mutates the doc and stays invisible to the Yjs
    // collaboration plugin, same constraint the old custom extension was
    // built around.
    PaginationPlus.configure({
      pageHeight: 1056,
      pageWidth: 816,
      pageGap: 32,
      marginTop: 96,
      marginBottom: 96,
      marginLeft: 96,
      marginRight: 96,
      contentMarginTop: 0,
      contentMarginBottom: 24,
      footerRight: "Page {page}",
      pageBreakBackground: "#f0f4f8", // matches EditorCanvas's outer canvas color
    }),
  ];

  // Before the first-ever sync, the editor runs in plain mode: no Yjs
  // binding, content comes from the `content` option passed to useEditor.
  // This is what lets the document show up and stay editable even if the
  // live connection is slow, rejected, or never arrives at all.
  if (!isLive) return base;

  return [
    ...base,
    Collaboration.configure({ document: ydoc }),
    CollaborationCaret.configure({
      provider,
      user: collaborationUser,
      render: (renderedUser) => {
        const typedUser = renderedUser as CollaborationUser;
        const key = typedUser.id ?? typedUser.name;

        const cursor = document.createElement("span");
        cursor.classList.add("collab-caret");
        cursor.setAttribute("data-user-key", key);
        cursor.style.setProperty("--caret-color", typedUser.color);

        const label = document.createElement("div");
        label.classList.add("collab-caret__label");
        label.textContent = typedUser.name;

        cursor.appendChild(label);
        return cursor;
      },
    }),
  ];
}

interface CollaborativeEditorProps {
  document: Document;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  collaborationUser: CollaborationUser;
  onlineUsers: OnlineUser[];
  connected: boolean;
  synced: boolean;
  everSynced: boolean;
  connectionStalled: boolean;
  user: User;
  idleUserIds: Set<string>;
}

function CollaborativeEditor({
  document,
  ydoc,
  provider,
  collaborationUser,
  onlineUsers,
  connected,
  synced,
  everSynced,
  connectionStalled,
  user,
  idleUserIds,
}: CollaborativeEditorProps) {
  const [docTitle, setDocTitle] = useState(document.title);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    document.updated_at ? new Date(document.updated_at) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const hasSeededContent = useRef(false);

  // Fail closed: if `role` is ever missing/unrecognized, treat the document
  // as read-only rather than editable. The backend already gates who can
  // reach this page at all (get_object() 403s a non-collaborator before we
  // ever get here) — this is purely about what the UI lets you *do* once
  // you're in.
  const role = document.role ?? "viewer";
  const isReadOnly = role === "viewer";

  // Holds the document's content while we're not yet on the live Yjs doc.
  // Starts as the REST-loaded content, updates as the person types in
  // plain mode, and — if the live connection comes up while they've typed
  // unsaved changes — is what seeds the Yjs doc, so nothing typed during
  // the "connecting" window is lost when we switch editors.
  const [fallbackContent, setFallbackContent] = useState(document.content);

  // Once this document has synced at least once, stay on the live,
  // Yjs-backed editor for the rest of this mount — including through a
  // later drop. Yjs is built to queue local edits offline and merge them
  // on reconnect, so there's no need (and real risk of duplicated content)
  // in swapping back to plain mode after a connection blip. Only before
  // the very first sync do we use the plain fallback editor.
  const isLive = everSynced;

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !isReadOnly,
      content: !isLive ? fallbackContent : undefined,
      extensions: buildEditorExtensions(
        isLive,
        ydoc,
        provider,
        collaborationUser
      ),
      editorProps: {
        attributes: {
          class: "outline-none min-h-full",
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        if (!isLive) {
          setFallbackContent(updatedEditor.getJSON());
        }
      },
    },
    [isLive, provider, collaborationUser, ydoc]
  );

  useEffect(() => {
    if (!editor || !synced || hasSeededContent.current) return;

    if (editor.isEmpty && !isTipTapContentEmpty(fallbackContent)) {
      editor.commands.setContent(fallbackContent);
    }

    hasSeededContent.current = true;
  }, [editor, synced, fallbackContent]);

  // Quiet status toasts — only on genuine transitions, never on first
  // connect (that one's just the normal startup and doesn't need a toast).
  const prevPhaseRef = useRef<"init" | "stalled" | "live" | "reconnecting">(
    "init"
  );
  useEffect(() => {
    const phase = everSynced
      ? connected
        ? "live"
        : "reconnecting"
      : connectionStalled
        ? "stalled"
        : "init";

    if (phase !== prevPhaseRef.current) {
      if (phase === "stalled") {
        toast.warning(
          "Live sync is taking a while — you can keep editing, changes save when you hit Save."
        );
      } else if (phase === "reconnecting") {
        toast.warning(
          "Live connection lost — your edits are safe and will sync once reconnected."
        );
      } else if (phase === "live" && prevPhaseRef.current !== "init") {
        toast.success("Live sync connected");
      }
      prevPhaseRef.current = phase;
    }
  }, [everSynced, connected, connectionStalled]);

  useEffect(() => {
    const carets = window.document.querySelectorAll<HTMLElement>("[data-user-key]");
    carets.forEach((el) => {
      const key = el.getAttribute("data-user-key");
      el.classList.toggle("is-idle", !!key && idleUserIds.has(key));
    });
  }, [idleUserIds]);

  const handleSave = useCallback(async () => {
    if (isSaving || !editor || isReadOnly) return;

    setIsSaving(true);
    try {
      const saved = await putDocument(document.id, {
        title: docTitle,
        content: editor.getJSON(),
      });
      setLastSaved(new Date(saved.updated_at));
      toast.success("Document saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save document"
      );
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, editor, document.id, docTitle, isReadOnly]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] overflow-hidden">
      <EditorToolbar
        editor={editor}
        docTitle={docTitle}
        onTitleChange={setDocTitle}
        lastSaved={lastSaved}
        isSaving={isSaving}
        onSave={handleSave}
        user={user}
        documentId={document.id}
        role={role}
      />

      {isReadOnly && <ReadOnlyBanner />}

      {!everSynced && connectionStalled && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex-shrink-0">
          <span>
            Live sync unavailable — you&apos;re editing the last saved
            version. Changes save when you click Save.
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <EditorCanvas editor={editor} />

        <CollaboratorsSidebar users={onlineUsers} connected={connected} />
      </div>

      {/* Styles for the custom collaboration caret rendered above. Global
          because CollaborationCaret injects these nodes directly into the
          ProseMirror DOM via ProseMirror decorations, outside React's tree
          — scoped/CSS-module styles wouldn't reach them. */}
      <style jsx global>{`
        .collab-caret {
          position: relative;
          border-left: 2px solid var(--caret-color, #888);
          margin-left: -1px;
          height: 1.1em;
          pointer-events: none;
          transition: opacity 300ms ease;
          opacity: 1;
        }
        .collab-caret.is-idle {
          opacity: 0;
        }
        .collab-caret__label {
          position: absolute;
          top: -1.4em;
          left: -2px;
          font-size: 11px;
          line-height: 1.4;
          white-space: nowrap;
          padding: 1px 6px;
          border-radius: 4px;
          color: white;
          background: var(--caret-color, #888);
          transition: opacity 300ms ease;
        }
      `}</style>
    </div>
  );
}

export default function DocumentEditor() {
  const params = useParams();
  const documentId = params?.id as string | undefined;
  const { user } = useUser();

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    ydoc,
    provider,
    synced,
    connected,
    onlineUsers,
    collaborationUser,
    idleUserIds,
    everSynced,
    connectionStalled,
  } = useDocumentCollaboration(documentId, user);

  useEffect(() => {
    if (!documentId) return;

    const id = documentId;
    let cancelled = false;

    async function loadDocument() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const doc = await getDocument(id);
        if (!cancelled) {
          setDocument(doc);
        }
      } catch (error) {
        if (!cancelled) {
          // A 403 lands here too (non-collaborator, or pending invite that
          // hasn't been activated yet) — the backend's get_object() check
          // is what actually enforces this; this message is just what the
          // person sees.
          setLoadError(
            error instanceof Error ? error.message : "Failed to load document"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-[#f0f4f8]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading document…
        </p>
      </div>
    );
  }

  if (loadError || !document || !documentId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2 bg-[#f0f4f8]">
        <p className="text-sm font-medium text-destructive">
          {loadError ?? "Document not found"}
        </p>
      </div>
    );
  }

  if (!user || !provider || !collaborationUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-[#f0f4f8]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Connecting to live session…
        </p>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      document={document}
      ydoc={ydoc}
      provider={provider}
      collaborationUser={collaborationUser}
      onlineUsers={onlineUsers}
      connected={connected}
      synced={synced}
      everSynced={everSynced}
      connectionStalled={connectionStalled}
      user={user}
      idleUserIds={idleUserIds}
    />
  );
}