# CollabFlow — Architecture Document

> A deep dive into how CollabFlow works under the hood.

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Tech Stack Matrix](#2-tech-stack-matrix)
- [3. Core Architecture Flows](#3-core-architecture-flows)
  - [3.1 Real-Time Chat Sync Flow](#31-real-time-chat-sync-flow)
  - [3.2 Document Collaboration (CRDT) Flow](#32-document-collaboration-crdt-flow)
  - [3.3 WebRTC Signaling Flow](#33-webrtc-signaling-flow)
- [4. Database Schema Overview](#4-database-schema-overview)
- [5. Security & Authentication](#5-security--authentication)
- [6. Deployment Architecture](#6-deployment-architecture)

---

## 1. System Overview

CollabFlow is a real-time collaboration platform built as a **Next.js 16** application with a **custom Node.js HTTP server** (`server.ts`). The custom server is necessary because Next.js's built-in server does not support long-lived WebSocket connections — a requirement for Socket.IO, which powers all real-time features (chat, document editing, kanban sync, and video call signaling).

```mermaid
graph TB
    subgraph Client["Browser Client"]
        NextApp["Next.js App Router<br/>(React 19, App Router)"]
        SocketClient["Socket.IO Client"]
        YjsClient["Yjs Y.Doc + Awareness"]
        WebRTCClient["RTCPeerConnection"]
    end

    subgraph CustomServer["Custom Node.js Server (server.ts)"]
        HTTP["HTTP Server"]
        NextHandler["Next.js Request Handler"]
        SocketServer["Socket.IO Server<br/>(/api/socketio)"]
    end

    subgraph Persistence["Data Layer"]
        Prisma["Prisma ORM v7"]
        PostgreSQL["PostgreSQL"]
        Supabase["Supabase Storage<br/>(File Uploads)"]
    end

    subgraph ExternalServices["External Services"]
        GoogleOAuth["Google OAuth"]
        STUN["Google STUN Servers"]
        PusherSvc["Pusher / Soketi<br/>(Supplementary)"]
    end

    NextApp -- "REST API (fetch)" --> HTTP
    SocketClient -- "WebSocket" --> SocketServer
    YjsClient -- "Binary Updates" --> SocketClient
    WebRTCClient -- "Signaling" --> SocketClient
    WebRTCClient -- "ICE Negotiation" --> STUN
    HTTP --> NextHandler
    NextHandler -- "Prisma Queries" --> Prisma
    Prisma --> PostgreSQL
    NextHandler -- "File Upload" --> Supabase
    NextHandler -- "Auth" --> GoogleOAuth
    NextHandler -- "Events" --> PusherSvc
```

**Why a custom `server.ts`?**

1. **WebSocket Lifecycle**: Socket.IO requires a persistent HTTP server to perform the WebSocket upgrade handshake. Next.js's default server doesn't expose the underlying `http.Server` instance, making it impossible to attach Socket.IO directly.
2. **Global Socket Instance**: The `io` instance is stored on `global.io`, allowing Next.js API routes to emit events to connected clients after persisting data (e.g., broadcasting a new message to a channel room after writing it to PostgreSQL).
3. **Room Management**: The server manages 5 distinct room types (`workspace:`, `channel:`, `doc:`, `board:`, `video:`) with per-room presence tracking and graceful disconnect cleanup.

---

## 2. Tech Stack Matrix

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | SSR, file-based routing, API routes |
| **UI Library** | React 19 | Component rendering |
| **Styling** | TailwindCSS v4, Radix UI Primitives | Design system, accessible components |
| **Animations** | Framer Motion | Page transitions, micro-interactions |
| **Icons** | Lucide React | Consistent icon set |
| **Rich Text Editor** | TipTap (StarterKit + 8 extensions) | Document editing with bubble/floating menus |
| **CRDT Engine** | Yjs + y-protocols | Conflict-free collaborative editing |
| **Real-Time Transport** | Socket.IO v4 (custom server) | WebSocket rooms, event broadcasting |
| **Supplementary RT** | Pusher / Soketi | Secondary real-time channel |
| **Video/Audio** | Native WebRTC (`RTCPeerConnection`) | Peer-to-peer media streams |
| **Virtual Background** | MediaPipe SelfieSegmentation | Background blur via canvas processing |
| **Authentication** | NextAuth.js v5 (JWT) | Google OAuth + email/password |
| **ORM** | Prisma v7 (`@prisma/adapter-pg`) | Type-safe database access |
| **Database** | PostgreSQL | Relational data persistence |
| **File Storage** | Supabase Storage | Image/PDF uploads |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable | Kanban card reordering |
| **Theming** | next-themes | Dark/light/system mode |
| **Deployment** | Azure App Service | Standalone Node.js output |

---

## 3. Core Architecture Flows

### 3.1 Real-Time Chat Sync Flow

Chat follows an **optimistic UI → API persistence → Socket.IO broadcast** pattern. The sender sees instant feedback while the server ensures durability and notifies all other clients.

```mermaid
sequenceDiagram
    participant UserA as User A (Sender)
    participant API as Next.js API Route
    participant DB as PostgreSQL
    participant SIO as Socket.IO Server
    participant UserB as User B (Receiver)

    Note over UserA: Types message & hits Enter
    UserA->>UserA: Optimistic insert<br/>(status: "pending")

    UserA->>API: POST /api/messages<br/>{content, channelId, attachments}
    API->>DB: prisma.message.create()
    DB-->>API: Message record
    API->>SIO: io.to("channel:{id}").emit("new-message")
    API-->>UserA: 201 Created + message object
    UserA->>UserA: Update status: "sent"

    SIO-->>UserB: "new-message" event
    UserB->>UserB: Append to local messages

    Note over UserA, UserB: Typing indicators flow separately
    UserA->>SIO: emit("typing", {channelId, userId, name})
    SIO-->>UserB: "user-typing" event
    UserB->>UserB: Show "User A is typing..."
    UserA->>SIO: emit("stop-typing", {channelId, userId})
    SIO-->>UserB: "user-stop-typing" event
```

**Edit/Delete** follow the same pattern — `PUT`/`DELETE` to `/api/messages/[id]` → Socket.IO broadcast → remote clients update in place. Deletes are **soft deletes** (`isDeleted: true`).

**Reactions** are toggled via `POST /api/messages/[id]/reactions` with the same optimistic update + broadcast pattern. The `Reaction` model enforces a unique constraint on `[messageId, userId, emoji]` to prevent duplicates.

---

### 3.2 Document Collaboration (CRDT) Flow

Document collaboration uses **Yjs** (a CRDT library) integrated with **TipTap** (ProseMirror-based editor). Socket.IO acts as the **sync transport** — there is no centralized Yjs server; all clients are equal peers that merge state via CRDT rules.

```mermaid
sequenceDiagram
    participant UserA as User A
    participant YjsA as Yjs Y.Doc (A)
    participant SIO as Socket.IO Server
    participant YjsB as Yjs Y.Doc (B)
    participant UserB as User B

    Note over UserA, UserB: Both join doc:{documentId} room

    UserA->>SIO: emit("join-document",<br/>{documentId, user: {id, name, color}})
    SIO-->>UserA: "existing-doc-users" [User B]
    SIO-->>UserB: "user-joined-doc" {User A}

    Note over UserA: Types "Hello World"
    UserA->>YjsA: Local text insert
    YjsA->>YjsA: Generate binary update<br/>(Uint8Array delta)
    YjsA->>SIO: emit("doc-update",<br/>{documentId, update: ArrayBuffer})
    SIO-->>YjsB: "doc-update" {update: ArrayBuffer}
    YjsB->>YjsB: Y.applyUpdate(ydoc, update)
    YjsB->>UserB: TipTap re-renders merged state

    Note over UserA, UserB: Cursor awareness (parallel channel)
    YjsA->>SIO: emit("awareness-update",<br/>{documentId, awareness: encoded})
    SIO-->>YjsB: "awareness-update"
    YjsB->>UserB: RemoteCursors renders<br/>User A's cursor position
```

**Key implementation details:**

- **`useDocumentSync` hook**: Creates a `Y.Doc` instance and a `y-protocols/awareness` instance per document session. Connects to Socket.IO, joins the `doc:{id}` room, and wires up `Y.Doc.on('update')` to emit binary deltas.
- **Awareness sync**: Uses `encodeAwarenessUpdate` / `applyAwarenessUpdate` from `y-protocols` to propagate cursor positions, user names, and colors.
- **TipTap integration**: `@tiptap/extension-collaboration` binds the TipTap editor to the shared `Y.Doc`. `@tiptap/extension-collaboration-cursor` renders remote cursors via Awareness data.
- **Persistence**: Content is periodically saved to PostgreSQL via `PUT /api/documents/[id]` (HTML export from TipTap). The Yjs state is authoritative during a session; the database stores the latest HTML snapshot for loading.

---

### 3.3 WebRTC Signaling Flow

Video/audio calls use **native WebRTC** (`RTCPeerConnection`) with Socket.IO as the **signaling server**. The actual media streams flow peer-to-peer — the server only facilitates the initial handshake.

```mermaid
sequenceDiagram
    participant A as User A (Initiator)
    participant SIO as Socket.IO Server
    participant B as User B (Joiner)
    participant STUN as STUN/TURN Server

    Note over A: Creates room, joins video:{roomId}
    A->>SIO: emit("join-room",<br/>{roomId, userId, userName, userImage})
    SIO-->>A: "existing-users" [ ]

    Note over B: Joins the same room
    B->>SIO: emit("join-room",<br/>{roomId, userId, userName, userImage})
    SIO-->>B: "existing-users" [{socketId: A, ...}]
    SIO-->>A: "user-joined-room" {socketId: B, ...}

    Note over B: Creates PeerConnection for User A
    B->>STUN: Gather ICE candidates
    STUN-->>B: ICE candidates

    B->>B: createOffer()
    B->>SIO: emit("offer",<br/>{targetSocketId: A, offer: SDP})
    SIO-->>A: "offer" {offer: SDP, fromSocketId: B}

    A->>A: setRemoteDescription(offer)
    A->>A: createAnswer()
    A->>SIO: emit("answer",<br/>{targetSocketId: B, answer: SDP})
    SIO-->>B: "answer" {answer: SDP, fromSocketId: A}

    B->>B: setRemoteDescription(answer)

    Note over A, B: ICE candidate exchange
    A->>SIO: emit("ice-candidate",<br/>{targetSocketId: B, candidate})
    SIO-->>B: "ice-candidate" {candidate, fromSocketId: A}
    B->>SIO: emit("ice-candidate",<br/>{targetSocketId: A, candidate})
    SIO-->>A: "ice-candidate" {candidate, fromSocketId: B}

    Note over A, B: P2P connection established
    A<-->B: Direct media stream (audio/video)

    Note over A, B: ICE restart on connection failure
    A->>SIO: emit("ice-restart",<br/>{targetSocketId: B})
    SIO-->>B: "ice-restart-request"<br/>{fromSocketId: A}
    B->>B: Renegotiate connection
```

**ICE Server Configuration** (from `useVideoCall.ts`):

```typescript
const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    // Optional TURN server via environment variables
    ...(process.env.NEXT_PUBLIC_TURN_URL ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    }] : []),
];
```

**Additional capabilities:**
- **Connection Quality Monitoring**: `oniceconnectionstatechange` tracks per-peer connection quality (`excellent` / `good` / `fair` / `poor`), displayed via `ConnectionQualityIndicator.tsx`.
- **Virtual Background**: `useVirtualBackground` hook uses **MediaPipe SelfieSegmentation** to segment the person from the background, applies a 10px Gaussian blur to the background, and outputs the processed stream via `canvas.captureStream(30)`.
- **In-Call Chat**: Text messages within the video room are broadcast via Socket.IO's `video-chat-message` event.

---

## 4. Database Schema Overview

The database is modeled around **Workspaces** as the top-level organizational unit. All collaborative resources belong to a workspace.

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : "has memberships"
    User ||--o{ Document : "authors"
    User ||--o{ Board : "authors"
    User ||--o{ Message : "sends"
    User ||--o{ Notification : "receives"
    User ||--o{ Card : "assigned to"

    Workspace ||--o{ WorkspaceMember : "has members"
    Workspace ||--o{ Document : "contains"
    Workspace ||--o{ Board : "contains"
    Workspace ||--o{ Channel : "contains"
    Workspace ||--o{ Activity : "tracks"

    Channel ||--o{ ChannelMember : "has members"
    Channel ||--o{ Message : "contains"

    Message ||--o{ Reaction : "has reactions"
    Message ||--o{ Message : "has replies (thread)"

    Document ||--o{ DocumentHistory : "has history"
    Document ||--o{ DocumentShare : "shared with"
    Document ||--o{ DocumentStar : "starred by"

    Board ||--o{ Column : "has columns"
    Column ||--o{ Card : "has cards"

    Card ||--o{ CardComment : "has comments"
    Card ||--o{ ChecklistItem : "has checklist"

    User {
        string id PK
        string name
        string email UK
        string image
        string password
    }
    Workspace {
        string id PK
        string name
        string slug UK
        string ownerId FK
        boolean isPublic
    }
    WorkspaceMember {
        string id PK
        string workspaceId FK
        string userId FK
        string role
    }
    Channel {
        string id PK
        string name
        string type
        string workspaceId FK
    }
    Message {
        string id PK
        string content
        string channelId FK
        string authorId FK
        string parentId FK
        boolean isPinned
        boolean isEdited
        boolean isDeleted
        json attachments
        int replyCount
    }
    Document {
        string id PK
        string title
        text content
        string authorId FK
        string workspaceId FK
        boolean isPublic
    }
    Board {
        string id PK
        string title
        string authorId FK
        string workspaceId FK
    }
    Column {
        string id PK
        string title
        int order
        string boardId FK
    }
    Card {
        string id PK
        string title
        text description
        string priority
        datetime dueDate
        datetime startDate
        string status
        string assigneeId FK
        string columnId FK
    }
    Activity {
        string id PK
        string userId FK
        string workspaceId FK
        string type
        string action
        string entityType
        json metadata
    }
    Notification {
        string id PK
        string userId FK
        string type
        string title
        boolean isRead
    }
```

**Key Design Decisions:**

| Decision | Rationale |
|---|---|
| Soft deletes on messages (`isDeleted` flag) | Preserves thread integrity; deleted messages show as "[message deleted]" |
| `labels` as `String[]` on Card | Avoids a join table for a simple tagging feature; leverages PostgreSQL array type |
| `attachments` as `Json` on Message | Flexible schema for file metadata (`{type, url, name, size}`) without a separate table |
| Single `assigneeId` on Card | Simplicity-first; each card has one assignee rather than a many-to-many relation |
| `DocumentHistory.snapshot` as `Text` | Full HTML content at each history point; enables point-in-time restore |
| Composite unique on `WorkspaceMember[workspaceId, userId]` | Prevents duplicate memberships |
| Composite unique on `Reaction[messageId, userId, emoji]` | One reaction per user per emoji per message |

---

## 5. Security & Authentication

### 5.1 Authentication Strategy

```mermaid
flowchart TD
    A["User visits /sign-in"] --> B{Auth Method?}
    B -->|Google OAuth| C["NextAuth Google Provider"]
    B -->|Email + Password| D["NextAuth Credentials Provider"]

    D --> E["Lookup user by email<br/>(Prisma)"]
    E --> F{"Password match?<br/>(bcrypt.compare)"}
    F -->|Yes| G["Issue JWT"]
    F -->|No| H["Return null<br/>(Auth failed)"]

    C --> I["Google OAuth flow"]
    I --> G

    G --> J["JWT stored in session cookie"]
    J --> K["Subsequent requests carry JWT"]
    K --> L["jwt callback injects user.id"]
    L --> M["session callback exposes user.id"]
```

- **Session Strategy**: JWT (stateless) — no server-side session store required.
- **Providers**: Google OAuth + Credentials (email/password with `bcryptjs` hashing).
- **User Provisioning**: `ensureUser.ts` guarantees a `User` record exists in the database for every authenticated session.

### 5.2 Middleware Route Protection

The `middleware.ts` runs on the **Edge Runtime** and enforces two rules:

1. **Authentication Gate**: All routes require a valid session except explicit public routes (`/`, `/sign-in`, `/sign-up`, `/explore`, `/api/auth/*`, `/api/register`).
2. **Security Headers**: Every response includes:

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=self, microphone=self, geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |

### 5.3 Workspace-Level Access Control

Every resource access is gated by workspace membership. The `workspaceAccess.ts` module provides four guard functions that are called inside API routes:

```mermaid
flowchart LR
    Request["API Request"] --> Auth["Verify JWT<br/>(NextAuth)"]
    Auth --> Guard{"Workspace<br/>Access Check"}

    Guard -->|checkDocumentWorkspaceAccess| DocCheck["Is author?<br/>Is public?<br/>Has share?<br/>Is workspace member?"]
    Guard -->|checkBoardWorkspaceAccess| BoardCheck["Is author?<br/>Is workspace member?"]
    Guard -->|checkCardWorkspaceAccess| CardCheck["Board author?<br/>Is workspace member?"]
    Guard -->|checkChannelWorkspaceAccess| ChanCheck["Is channel member?<br/>Is workspace member?"]

    DocCheck -->|Any true| Allow["200 OK"]
    DocCheck -->|All false| Deny["403 Forbidden"]
    BoardCheck -->|Any true| Allow
    BoardCheck -->|All false| Deny
    CardCheck -->|Any true| Allow
    CardCheck -->|All false| Deny
    ChanCheck -->|Any true| Allow
    ChanCheck -->|All false| Deny
```

### 5.4 API Rate Limiting

An **in-memory sliding window** rate limiter (`rateLimit.ts`) protects API routes against abuse. Expired entries are garbage-collected every 5 minutes.

| Category | Limit | Window |
|---|---|---|
| Read APIs | 120 req | 60 seconds |
| Write APIs (create/update/delete) | 30 req | 60 seconds |
| Authentication | 10 req | 60 seconds |
| File Upload | 10 req | 60 seconds |
| Search | 30 req | 60 seconds |

---

## 6. Deployment Architecture

### 6.1 Target Platform

CollabFlow is deployed to **Azure App Service** as a standalone Node.js application.

```mermaid
graph TB
    subgraph Azure["Azure App Service"]
        Node["Node.js Process<br/>(server.js)"]
        NextStandalone["Next.js Standalone Bundle"]
        SocketProcess["Socket.IO<br/>(in-process)"]

        Node --> NextStandalone
        Node --> SocketProcess
    end

    subgraph External["External Services"]
        PG["Azure PostgreSQL<br/>(Flexible Server)"]
        SupaStorage["Supabase Storage"]
        PusherCloud["Pusher Cloud / Soketi"]
        GoogleAuth["Google OAuth"]
    end

    Client["Browser Clients"] -- "HTTPS + WSS" --> Azure
    Node --> PG
    Node --> SupaStorage
    Node --> PusherCloud
    Node --> GoogleAuth

    subgraph CI["GitHub Actions"]
        Build["next build +<br/>tsc server.ts"]
        Deploy["Deploy to Azure"]
        Build --> Deploy
    end

    CI --> Azure
```

### 6.2 Build Pipeline

```bash
# Build steps (from package.json)
next build                    # Generates .next/standalone
npx tsc server.ts \
  --outDir .next/standalone \
  --esModuleInterop \
  --module commonjs \
  --skipLibCheck               # Compiles custom server to JS

# Start command
node .next/standalone/server.js
```

**Key configuration** (`next.config.ts`):
- `output: 'standalone'` — produces a self-contained deployment artifact with all `node_modules` inlined.
- `images.unoptimized: true` — disables Next.js image optimization (not available on Azure App Service without custom configuration).

### 6.3 WebSocket Scaling Challenges

The current architecture runs Socket.IO **in-process** with the Node.js server. This has specific scaling implications:

| Challenge | Impact | Mitigation |
|---|---|---|
| **Single-process Socket.IO** | All WebSocket connections must route to the same process; horizontal scaling breaks room-based broadcasting | Pusher/Soketi is available as a supplementary broadcast channel that works across instances |
| **In-memory rate limiter** | Rate limit state is per-process; not shared across instances | Acceptable for single-instance deployment; would need Redis adapter for multi-instance |
| **Sticky sessions required** | Socket.IO's polling fallback requires consistent routing to the same server | Azure App Service ARR affinity must be enabled |
| **Connection limits** | Azure App Service has per-instance connection limits | `maxHttpBufferSize: 1MB`, `perMessageDeflate: false`, `httpCompression: false` — tuned for lower latency over bandwidth |

For higher scale, the recommended evolution path would be:
1. Add `@socket.io/redis-adapter` to share rooms across processes
2. Use Azure SignalR Service or a dedicated WebSocket gateway
3. Move Yjs sync to a dedicated collaboration server (e.g., Hocuspocus)
