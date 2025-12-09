# CollabFlow 🚀

> **Real-time Collaboration Platform for Modern Teams**

CollabFlow is a comprehensive collaboration platform built with Next.js 15, featuring real-time document editing, Kanban boards, team chat, and video conferencing.

![CollabFlow](public/DarkMode-CollabFlow-logo-transparent.png)

---

## ✨ Features

### 📝 Document Editor
- Rich text editing with **TipTap**
- Document history tracking (who edited what)
- Auto-save with Ctrl+S
- Create, edit, and delete documents
- Share documents via URL

### 📋 Kanban Board
- Drag-and-drop task management
- Create, edit, and delete cards
- Multiple columns (To Do, In Progress, Review, Done)
- Full database persistence
- Real-time updates

### 💬 Team Chat *(Coming Soon)*
- Real-time messaging
- Channel-based conversations
- Direct messages

### 📹 Video Calling *(Coming Soon)*
- WebRTC-based video conferencing
- Screen sharing
- Multiple participants

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | TailwindCSS + shadcn/ui |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7 |
| **Authentication** | NextAuth.js v5 (Google OAuth) |
| **Editor** | TipTap (ProseMirror) |
| **Drag & Drop** | dnd-kit |
| **Animations** | Framer Motion |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/collabflow.git
   cd collabflow
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables**
   
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/collabflow"
   
   AUTH_SECRET="your-secret-key-here"
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
collabflow/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── prisma.config.ts    # Prisma 7 config
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── (auth)/         # Auth pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── editor/[id]/
│   │   │   ├── kanban/
│   │   │   ├── chat/
│   │   │   ├── video/
│   │   │   └── settings/
│   │   ├── api/            # API routes
│   │   │   ├── auth/
│   │   │   ├── documents/
│   │   │   ├── boards/
│   │   │   └── cards/
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   ├── kanban/         # Kanban components
│   │   ├── Sidebar.tsx
│   │   └── ThemeToggle.tsx
│   └── lib/
│       ├── auth.ts         # Auth config
│       ├── prisma.ts       # Prisma client
│       └── ensureUser.ts   # User utility
└── package.json
```

---

## 🗄️ Database Models

| Model | Description |
|-------|-------------|
| `User` | User accounts (NextAuth) |
| `Document` | Rich text documents |
| `DocumentHistory` | Edit history tracking |
| `Board` | Kanban boards |
| `Column` | Board columns |
| `Card` | Task cards |

---

## 🎨 Screenshots

### Landing Page
Modern, animated landing page with feature highlights.

### Dashboard
Quick overview with recent documents and activity.

### Document Editor
Rich text editor with formatting toolbar and history panel.

### Kanban Board
Drag-and-drop task management with multiple columns.

---

## 🔮 Roadmap

- [x] Landing page
- [x] Authentication (Google OAuth)
- [x] Dashboard
- [x] Document editor with history
- [x] Kanban board with persistence
- [ ] Real-time collaboration (Yjs/Hocuspocus)
- [ ] Team chat
- [ ] Video conferencing
- [ ] User roles & permissions
- [ ] Export documents (PDF, Markdown)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Your Name**  
Final Year Project - 2025

---

<p align="center">
  Made with ❤️ using Next.js
</p>
