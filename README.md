# CollabFlow

**CollabFlow** is a state-of-the-art workspace collaboration platform designed for modern, high-velocity teams. By seamlessly combining real-time messaging, multiplayer CRDT document editing, infinite-canvas whiteboards, video huddles, and Kanban project management into a single cohesive interface, CollabFlow eliminates context-switching and brings your entire team's workflow under one roof.

## Feature Status

| Feature | Status | Details |
| :--- | :---: | :--- |
| **Real-time team chat** | ✅ | Cursor pagination, threads, reactions, mentions, attachments, idempotency |
| **CRDT document editor** | ✅ | Yjs, TipTap, remote cursors, version history, view/edit permissions |
| **Collaborative whiteboard** | ✅ | tldraw, real-time multi-user, socket-based sync, autosave fallback |
| **Kanban boards** | ✅ | Fractional indexing, WIP limits, epics, dependencies, time logging, GitHub integration |
| **Video calling** | ✅ | Native WebRTC mesh, ICE restart, background blur, screen share, waiting room |
| **Activity feed & notifications**| ✅ | Audit log, @mentions, live badge updates |
| **Multi-tenant workspaces** | ✅ | RBAC, public/private, member roles |
| **Video scale limitations** | ⚠️ | Video calling currently limited to 6 participants maximum (WebRTC mesh topology restriction) |
| **Automated tests** | ⚠️ | No automated test suite yet |
| **Message full-text search** | ⏳ | Postgres FTS — in progress |
| **LiveKit SFU migration** | ⏳ | Planned infrastructure swap (removes 6-user ceiling) |
| **Automated test suite** | ⏳ | Planned adoption of Jest + Playwright |

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4, Framer Motion, Radix UI, Lucide |
| **Database & ORM** | PostgreSQL, Prisma ORM, pg |
| **Real-time Core** | Node.js Custom Server, Socket.IO, Redis Adapter |
| **Collaboration** | Yjs, `@tiptap`, `@tldraw` |
| **Authentication** | Auth.js (NextAuth v5 beta), bcryptjs |

## Architecture

CollabFlow utilizes a dual-engine architecture:
*   **Next.js App Router**: Powers the server-side rendering, React Server Components, and standard REST API endpoints.
*   **Custom Node.js Server (`server.ts`)**: Bypasses the serverless limitations of standard Next.js by attaching a persistent `Socket.IO` server to the underlying HTTP instance. This handles all persistent duplex connections.
*   **Redis Horizontal Scaling**: `@socket.io/redis-adapter` enables the Node server to scale horizontally across multiple instances while preserving global pub/sub routing for sockets.
*   **Modular Socket Handlers**: Real-time traffic is decoupled by domain into `src/socket/handlers/` namespaces (chat, document, kanban, video, whiteboard).

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/db`) |
| `NEXTAUTH_URL` | Base URL of the application in development/production (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Core encryption secret for session cookies (generate via `openssl rand -base64 32`) |
| `AUTH_SECRET` | Alias/fallback for NextAuth v5 secret algorithms |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console |
| `GITHUB_ID` | OAuth App ID from GitHub Developer Settings |
| `GITHUB_SECRET` | OAuth App Secret from GitHub Developer Settings |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob storage backend credentials for attachments |
| `AZURE_STORAGE_CONTAINER_NAME` | Target container name in Azure Blob Storage |
| `REDIS_URL` | Required connection string for Socket.IO horizontal scaling (e.g. `redis://localhost:6379`) |
| `NEXT_PUBLIC_SOCKET_URL` | (Optional) Explicit WSS URL override if hosting the WebSocket server separately |
| `NEXT_PUBLIC_TURN_URL` | (Optional) TURN server URL for NAT traversal in WebRTC Video Calling |
| `NEXT_PUBLIC_TURN_USERNAME` | (Optional) TURN server username |
| `NEXT_PUBLIC_TURN_PASSWORD` | (Optional) TURN server credential |

## Local Development

Ensure you have Node.js 18+ and Docker installed before proceeding.

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/your-username/collabflow.git
   cd collabflow
   npm install --legacy-peer-deps
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Open .env and fill in your specific variables (especially DATABASE_URL and REDIS_URL)
   ```

3. **Start local infrastructure (Postgres + Redis):**
   ```bash
   docker-compose up -d
   ```

4. **Initialize database schema:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   > ⚠️ **CRITICAL NOTE:** Always use `npm run dev` (which executes `tsx server.ts`), NOT standard `next dev`. Next.js standalone dev servers do not support persistent WebSocket upgrades; the custom server is strictly required for the platform to function.

## Socket Events Reference

**Global / Presence**
*   `user-joined`, `user-left`, `workspace-online-users`

**Chat**
*   `new-message`, `message-updated`, `message-deleted`
*   `message-reaction`, `thread-reply`, `reply-count-update`

**Document Editor**
*   `doc-initial-state`, `doc-update`, `awareness-update`
*   `existing-doc-users`, `user-joined-doc`, `user-left-doc`

**Whiteboard**
*   `whiteboard:join`, `whiteboard:leave`, `whiteboard:error`
*   `whiteboard:state-sync`, `whiteboard:cursor-update`

**Kanban**
*   `kanban:join`, `kanban:leave`, `kanban:error`
*   `kanban:task-created`, `kanban:task-updated`, `kanban:task-deleted`
*   `kanban:task-moved`, `kanban:column-created`, `kanban:column-updated`

**Video Calling**
*   `join-call`, `leave-call`, `call-users`, `user-joined-call`
*   `offer`, `answer`, `ice-candidate`, `peer-disconnected`

## Known Limitations & Roadmap
*   **WebRTC Architecture:** Video calls rely on a client-side mesh topology using native RTCPeerConnection, which degrades exponentially past 6 peers per room.
*   **Test Coverage:** No unit or end-to-end testing coverage currently integrated in the CI pipeline.
*   **Offline Support:** Documents do not currently fallback gracefully to IndexedDB when the socket connection drops; changes made entirely offline will bounce.
