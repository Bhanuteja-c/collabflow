# CollabFlow

> **Real-time Collaboration Platform for Modern Teams**

CollabFlow is an open-source collaboration platform built with Next.js 15, featuring real-time document editing, Kanban boards, team chat, and video conferencing.

---

## Features

### Document Editor
- Rich text editing with TipTap
- Document history tracking
- Auto-save with Ctrl+S
- Grid/List view toggle
- Sort by date or name
- Share documents via URL

### Kanban Board
- Drag-and-drop entire cards
- Inline card creation
- Color-coded columns (To Do, In Progress, Review, Done)
- Visual drag feedback with scale/rotate effects

### Team Chat
- Real-time messaging with Socket.io
- Channel-based conversations
- Typing indicators
- Emoji picker

### Video Calling
- WebRTC peer-to-peer video
- Multi-user support (mesh topology)
- Mute/camera toggle
- Screen sharing
- Invite link sharing

### Settings
- Profile management
- Theme toggle (Light/Dark/System)
- Notification preferences
- Sign out

---

## Tech Stack

| Category           | Technology                    |
| ------------------ | ----------------------------- |
| Framework          | Next.js 15 (App Router)       |
| Language           | TypeScript                    |
| Styling            | TailwindCSS v4 + shadcn/ui    |
| Database           | PostgreSQL                    |
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
- PostgreSQL 15+
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
│   │   ├── (dashboard)/      # Dashboard pages
│   │   │   ├── dashboard/    # Overview
│   │   │   ├── documents/    # Documents list
│   │   │   ├── editor/[id]/  # Document editor
│   │   │   ├── kanban/       # Kanban board
│   │   │   ├── chat/         # Team chat
│   │   │   ├── video/        # Video calls
│   │   │   └── settings/     # User settings
│   │   ├── api/              # API routes
│   │   ├── sign-in/          # Auth page
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── landing/          # Landing page sections
│   │   ├── kanban/           # Kanban components
│   │   └── ui/               # shadcn + custom UI
│   ├── hooks/
│   │   ├── useSocket.ts      # Chat socket hook
│   │   └── useVideoCall.ts   # Video WebRTC hook
│   └── lib/
│       ├── auth.ts           # Auth config
│       ├── prisma.ts         # Prisma client
│       └── socket.ts         # Socket helpers
└── package.json
```

---

## Roadmap

- [x] Landing page (2025 SaaS design)
- [x] Authentication (Google OAuth)
- [x] Dashboard with stats
- [x] Document editor with history
- [x] Documents page with grid/list view
- [x] Kanban board with drag-and-drop
- [x] Team chat (Socket.io)
- [x] Video calling (WebRTC)
- [x] Settings page
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
