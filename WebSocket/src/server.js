const WebSocket = require("ws");
const http = require("http");
const Y = require("yjs");
const syncProtocol = require("y-protocols/sync");
const awarenessProtocol = require("y-protocols/awareness");
const encoding = require("lib0/encoding");
const decoding = require("lib0/decoding");
const map = require("lib0/map");

const pingTimeout = 30000;
const messageSync = 0;
const messageAwareness = 1;

// Base URL of the Django API, used to verify that a connecting client
// actually has access to the document room they're trying to join.
const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000";

/**
 * Pulls the room name (document id) and auth token out of the raw
 * upgrade request URL, e.g. "/3f2c...-uuid?token=abc123
 */
const parseConnInfo = (reqUrl) => {
    const [pathPart, queryString] = (reqUrl || "/").split("?");
    const docName = pathPart.slice(1) || "default";
    const token = new URLSearchParams(queryString || "").get("token");
    return { docName, token };
};

/**
 * Confirms the requesting user has access to this document by asking
 * Django — the same endpoint the frontend already uses (getDocument),
 * which is scoped server-side to the document's owner/collaborators.
 * This is the single source of truth for permissions; we don't
 * duplicate any role logic here.
 */
const verifyDocumentAccess = async (docName, token) => {
    if (!token) return false;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${DJANGO_API_URL}/api/documents/${docName}/`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok;
    } catch (err) {
        console.error(`[y-ws] auth check failed for room "${docName}":`, err.message);
        return false;
    }
};

/** @type {Map<string, WSSharedDoc>} */
const docs = new Map();

const send = (doc, conn, message) => {
    if (
        conn.readyState !== WebSocket.CONNECTING &&
        conn.readyState !== WebSocket.OPEN
    ) {
        closeConn(doc, conn);
        return;
    }
    try {
        conn.send(message, (err) => {
            if (err) closeConn(doc, conn);
        });
    } catch (e) {
        closeConn(doc, conn);
    }
};

const closeConn = (doc, conn) => {
    if (doc.conns.has(conn)) {
        const controlledIds = doc.conns.get(conn);
        doc.conns.delete(conn);
        awarenessProtocol.removeAwarenessStates(
            doc.awareness,
            Array.from(controlledIds),
            null
        );
        if (doc.conns.size === 0) {
            docs.delete(doc.name);
            console.log(`[y-ws] room "${doc.name}" closed (no more connections)`);
        }
    }
    try {
        conn.close();
    } catch {
        /* already closed */
    }
};

class WSSharedDoc extends Y.Doc {
    constructor(name) {
        super({ gc: true });
        this.name = name;
        /** @type {Map<WebSocket, Set<number>>} */
        this.conns = new Map();

        this.awareness = new awarenessProtocol.Awareness(this);
        this.awareness.setLocalState(null);

        this.awareness.on("update", ({ added, updated, removed }, conn) => {
            const changedClients = added.concat(updated, removed);
            if (conn !== null) {
                const connControlledIds = this.conns.get(conn);
                if (connControlledIds !== undefined) {
                    added.forEach((clientID) => connControlledIds.add(clientID));
                    removed.forEach((clientID) => connControlledIds.delete(clientID));
                }
            }
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
            );
            const buff = encoding.toUint8Array(encoder);
            this.conns.forEach((_, c) => send(this, c, buff));
        });

        this.on("update", (update) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            this.conns.forEach((_, c) => send(this, c, message));
        });
    }
}

const getYDoc = (docName) =>
    map.setIfUndefined(docs, docName, () => {
        console.log(`[y-ws] room "${docName}" created`);
        const doc = new WSSharedDoc(docName);
        docs.set(docName, doc);
        return doc;
    });

const messageListener = (conn, doc, message) => {
    try {
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
                if (encoding.length(encoder) > 1) {
                    send(doc, conn, encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness: {
                awarenessProtocol.applyAwarenessUpdate(
                    doc.awareness,
                    decoding.readVarUint8Array(decoder),
                    conn
                );
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error("[y-ws] message error:", err);
    }
};

const setupWSConnection = (conn, req) => {
    conn.binaryType = "arraybuffer";

    const url = req.url || "/";
    const docName = url.slice(1).split("?")[0] || "default";
    const doc = getYDoc(docName);
    doc.conns.set(conn, new Set());

    console.log(`[y-ws] client connected to room "${docName}"`);

    conn.on("message", (message) =>
        messageListener(conn, doc, new Uint8Array(message))
    );

    let pongReceived = true;
    const pingInterval = setInterval(() => {
        if (!pongReceived) {
            if (doc.conns.has(conn)) closeConn(doc, conn);
            clearInterval(pingInterval);
        } else if (doc.conns.has(conn)) {
            pongReceived = false;
            try {
                conn.ping();
            } catch {
                closeConn(doc, conn);
                clearInterval(pingInterval);
            }
        }
    }, pingTimeout);

    conn.on("close", () => {
        closeConn(doc, conn);
        clearInterval(pingInterval);
        console.log(`[y-ws] client disconnected from room "${docName}"`);
    });

    conn.on("pong", () => {
        pongReceived = true;
    });

    // Initial sync step 1
    {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, doc);
        send(doc, conn, encoding.toUint8Array(encoder));
    }

    // Send current awareness state to the new client
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
                doc.awareness,
                Array.from(awarenessStates.keys())
            )
        );
        send(doc, conn, encoding.toUint8Array(encoder));
    }
};

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 1234;

const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("y-websocket server is running\n");
});

const wss = new WebSocket.Server({
    server,
    verifyClient: (info, callback) => {
        const { docName, token } = parseConnInfo(info.req.url);
        verifyDocumentAccess(docName, token).then((allowed) => {
            if (!allowed) {
                console.log(`[y-ws] rejected connection to room "${docName}" (unauthorized)`);
                callback(false, 401, "Unauthorized");
                return;
            }
            callback(true);
        });
    },
});
wss.on("connection", setupWSConnection);

server.listen(port, host, () => {
    console.log(`[y-ws] listening on ws://${host}:${port}`);
    console.log("======================================");
    console.log("Editly WebSocket Server Started");
    console.log(`Environment : ${process.env.NODE_ENV || "development"}`);
    console.log(`Host        : ${host}`);
    console.log(`Port        : ${port}`);
    console.log("======================================");
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`[y-ws] ${signal} received. Shutting down...`);

    wss.clients.forEach((client) => {
        try {
            client.close();
        } catch (err) {
            console.error("[y-ws] Error closing client:", err);
        }
    });

    server.close(() => {
        console.log("[y-ws] HTTP server closed.");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("[y-ws] Force shutdown.");
        process.exit(1);
    }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));