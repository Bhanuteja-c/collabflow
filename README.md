# CollabFlow

> **Real-time Collaboration Platform for Modern Teams**

CollabFlow is an open-source collaboration platform built with Next.js 15, featuring real-time document editing, Kanban boards, team chat, video conferencing, and activity feeds.

---

## Features

### 🏢 Workspaces
- Team-based workspaces with roles (owner, admin, member, viewer)
- Invite members via email
- Workspace-scoped content (documents, boards, channels)
- Activity feed dashboard

### 📄 Document Editor
- Rich text editing with TipTap
- Document history tracking
- Auto-save with Ctrl+S
- Grid/List view toggle
- Share documents via URL

### 📋 Kanban Board
- Drag-and-drop cards between columns
- Task assignment with deadlines
- Priority levels & checklists
- Color-coded columns (To Do, In Progress, Review, Done)

### 💬 Team Chat
- Real-time messaging with Socket.io
- Channel-based conversations
- **Code snippets** with ```language``` syntax highlighting
- **Inline code** with `backticks`
- **Card links** (`#card:id`) with hover preview
- **Document links** (`#doc:id`) with hover preview
- @mentions and emoji picker
- Typing indicators

### 📹 Video Calling
- WebRTC peer-to-peer video (Google Meet style)
- Multi-user grid/speaker view
- Mute/camera toggle
- Screen sharing & Picture-in-Picture
- In-call chat & reactions

### 📊 Activity Feed
- Real-time team activity dashboard
- Tracks card moves, document edits, member joins
- Color-coded by action type
- Auto-refreshing widget

### ⚙️ Settings
- Profile management
- Theme toggle (Light/Dark/System)
- Notification preferences

---

## Tech Stack

| Category           | Technology                    |
| ------------------ | ----------------------------- |
| Framework          | Next.js 15 (App Router)       |
| Language           | TypeScript                    |
| Styling            | TailwindCSS v4 + shadcn/ui    |
| Database           | PostgreSQL (Neon)             |
| ORM                | Prisma 7                      |
| Authentication     | NextAuth.js v5 (Google OAuth) |
| Editor             | TipTap (ProseMirror)          |
| Real-time          | Socket.io                     |
| Video              | WebRTC (native)               |
| Drag and Drop      | dnd-kit                       |
| Animations         | Framer Motion                 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Neon serverless)
- Google OAuth credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/Bhanuteja-c/collabflow.git
cd collabflow

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Run development server (with Socket.io)
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Project Structure

```
collabflow/
├── server.ts                 # Custom server with Socket.io
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── app/
│   │   ├── workspace/[slug]/ # Workspace pages
│   │   │   ├── page.tsx      # Dashboard with ActivityFeed
│   │   │   ├── documents/    # Documents list
│   │   │   ├── editor/[id]/  # Document editor
│   │   │   ├── kanban/       # Kanban board
│   │   │   ├── chat/         # Team chat
│   │   │   ├── video/        # Video calls
│   │   │   └── settings/     # Workspace settings
│   │   ├── api/              # API routes
│   │   ├── sign-in/          # Auth page
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── chat/             # Chat components (CodeBlock, CardLinkPreview, etc.)
│   │   ├── dashboard/        # Dashboard widgets (ActivityFeed)
│   │   ├── kanban/           # Kanban components
│   │   ├── video/            # Video call components
│   │   └── ui/               # shadcn + custom UI
│   ├── hooks/
│   │   ├── useSocket.ts      # Chat socket hook
│   │   └── useVideoCall.ts   # Video WebRTC hook
│   └── lib/
│       ├── auth.ts           # Auth config
│       ├── prisma.ts         # Prisma client
│       ├── activity.ts       # Activity logging utility
│       └── socket.ts         # Socket helpers
└── package.json
```

---

## Roadmap

- [x] Landing page (2025 SaaS design)
- [x] Authentication (Google OAuth)
- [x] Workspace-based collaboration
- [x] Document editor with history
- [x] Kanban board with drag-and-drop
- [x] Team chat with Socket.io
- [x] Video calling (WebRTC, Google Meet style)
- [x] Code snippets in chat
- [x] Task ↔ Chat links (`#card:id`, `#doc:id`)
- [x] Activity feed with logging
- [ ] Public workspaces
- [ ] Real-time collaboration (Yjs)
- [ ] PDF/Markdown export

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - Free forever, open source.

---

## Author

**Bhanuteja-c**  
Final Year Project - 2025
