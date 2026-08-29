"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { getAccessToken } from "@/lib/axios";
import { getUserColor } from "@/lib/collaboration/userColor";
import { User } from "@/types/auth";
import { CollaborationUser, OnlineUser } from "@/types/collaboration";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

// How long a remote cursor can sit without moving before we fade it out.
const IDLE_THRESHOLD_MS = 5000;
const IDLE_CHECK_INTERVAL_MS = 1000;

// How long to wait for a first-ever sync before we stop calling the UI
// state "connecting". Purely a status label — never blocks editing, since
// the document is already visible and editable via the REST-backed
// fallback the whole time.
const SYNC_STALL_TIMEOUT_MS = 8000;

function buildCollaborationUser(user: User): CollaborationUser {
  const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
  return {
    id: user.id,
    name,
    color: getUserColor(user.id),
    profile_pic: user.profile_pic,
  };
}

export function useDocumentCollaboration(
  documentId: string | undefined,
  user: User | null,
) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [synced, setSynced] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [idleUserIds, setIdleUserIds] = useState<Set<string>>(new Set());
  // True once this document has synced at least once during this mount.
  // Distinguishes "never connected yet" (safe to fall back to a plain,
  // non-collaborative editor) from "was live, just dropped" (safe to keep
  // editing through the same Yjs doc — it queues local edits and merges
  // them once reconnected, which is exactly what it's designed to do).
  const [everSynced, setEverSynced] = useState(false);
  // True if we've waited past SYNC_STALL_TIMEOUT_MS without a first sync.
  // Status-label signal only — never gates editing.
  const [connectionStalled, setConnectionStalled] = useState(false);

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);


  const collaborationUser = useMemo(
    () => (user ? buildCollaborationUser(user) : null),
    [user],
  );

  const userId = user?.id;

  // clientId -> last-seen serialized cursor, to detect movement
  const previousCursorsRef = useRef<Map<number, string>>(new Map());
  // stable user key -> timestamp of last detected cursor movement
  const lastActivityRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!documentId || !userId) {
      return;
    }

    const token = getAccessToken();
    const wsProvider = new WebsocketProvider(WS_URL, documentId, ydoc, {
      params: token ? { token } : {},
    });

    wsProvider.awareness.setLocalStateField("user", collaborationUser);

    const handleStatus = ({ status }: { status: string }) => {
      setConnected(status === "connected");
    };

    const stallTimer = setTimeout(() => {
      setConnectionStalled(true);
    }, SYNC_STALL_TIMEOUT_MS);

    const handleSync = (isSynced: boolean) => {
      setSynced(isSynced);
      if (isSynced) {
        setEverSynced(true);
        setConnectionStalled(false);
        clearTimeout(stallTimer);
      }
    };

    const updateOnlineUsers = () => {
      const states = wsProvider.awareness.getStates();
      const now = Date.now();

      // Dedupe by stable user id (see the multi-tab fix) while we're here.
      const byUserId = new Map<string, OnlineUser>();

      states.forEach((state, clientId) => {
        const userState = state.user as CollaborationUser | undefined;
        if (!userState?.name) return;

        const key = userState.id ?? userState.name;
        const isThisConnectionMe = clientId === wsProvider.awareness.clientID;

        // Track cursor movement per-connection, record activity against
        // the person (not the connection) so any of their tabs counts.
        const serializedCursor = state.cursor
          ? JSON.stringify(state.cursor)
          : null;
        const prevSerialized = previousCursorsRef.current.get(clientId);
        if (serializedCursor !== null && serializedCursor !== prevSerialized) {
          lastActivityRef.current.set(key, now);
        }
        if (serializedCursor !== null) {
          previousCursorsRef.current.set(clientId, serializedCursor);
        }

        const existing = byUserId.get(key);
        if (existing) {
          existing.sessionCount += 1;
          existing.isCurrentUser = existing.isCurrentUser || isThisConnectionMe;
          if (isThisConnectionMe) {
            existing.clientId = clientId;
          }
          return;
        }

        byUserId.set(key, {
          id: key,
          clientId,
          name: userState.name,
          color: userState.color,
          profile_pic: userState.profile_pic,
          isCurrentUser: isThisConnectionMe,
          sessionCount: 1,
        });
      });

      const users = Array.from(byUserId.values());

      users.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return a.name.localeCompare(b.name);
      });

      setOnlineUsers(users);
    };

    wsProvider.on("status", handleStatus);
    wsProvider.on("sync", handleSync);
    wsProvider.awareness.on("change", updateOnlineUsers);
    updateOnlineUsers();
    setProvider(wsProvider);

    return () => {
      wsProvider.off("status", handleStatus);
      wsProvider.off("sync", handleSync);
      wsProvider.awareness.off("change", updateOnlineUsers);
      clearTimeout(stallTimer);
      wsProvider.destroy();
      ydoc.destroy();
      setProvider(null);
      setSynced(false);
      setConnected(false);
      setOnlineUsers([]);
      setIdleUserIds(new Set());
      setEverSynced(false);
      setConnectionStalled(false);
      previousCursorsRef.current.clear();
      lastActivityRef.current.clear();
    };
  }, [documentId, userId, ydoc]);


  useEffect(() => {
    if (!provider) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const idle = new Set<string>();
      lastActivityRef.current.forEach((lastActive, key) => {
        if (now - lastActive > IDLE_THRESHOLD_MS) {
          idle.add(key);
        }
      });
      setIdleUserIds(idle);
    }, IDLE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [provider]);

  return {
    ydoc,
    provider,
    synced,
    connected,
    onlineUsers,
    collaborationUser,
    idleUserIds,
    everSynced,
    connectionStalled,
  };
}