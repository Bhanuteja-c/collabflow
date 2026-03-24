## AREA 1: Notification System

### 🔍 Current State
- **Creation triggers:** Generated via `prisma.notification.create` inside core API routes and socket handlers (e.g., `src/app/api/messages/route.ts`, `src/socket/handlers/chat.ts`, `src/lib/notifications.ts`). Covers mentions, workspace invites, and document shares.
- **Delivery mechanism:** Hybrid approach. While triggers exist in socket files, delivery to the UI relies heavily on REST polling via `GET /api/notifications` mapped in `useNotifications.ts`. No direct socket-level global notification dispatcher observed in `useNotifications.ts` beyond specific feature payloads.
- **UI Components:** Implemented via two robust components: `src/components/NotificationBell.tsx` and `src/components/NotificationsDropdown.tsx`. Features visual badges, sound toggles (`Volume2`/`VolumeX`), and unread counts.
- **Read State:** Notifications can be marked read individually on click or in bulk via `POST /api/notifications` (`markAllRead` payload). Tracked via `isRead` boolean on the Postgres model.
- **Filtering:** Implemented entirely client-side inside `NotificationsDropdown.tsx` via `useMemo`. Categories include All, Unread, Mentions, Invites.
- **Email:** Missing. No email generation logic or dependencies (e.g., NodeMailer, SendGrid, Resend) exist in `package.json` or core code. In-app only.
- **Persistence:** Fully persisted via the `Notification` model in `prisma/schema.prisma`.
- **Limits:** The API route hardcodes a `take: 20` limit without any cursor or offset pagination. No "clear all / delete all" route exists; users can only mark them read.

### ⚠️ Gaps & Issues
- **Critical:** Client-side filtering combined with a hard limit of 20 means if a user has 25 notifications (15 unread older ones, 10 read newer ones), the UI will only fetch the latest 20 and filter inside that block—hiding the remaining unread ones permanently until others are dismissed or deleted.
- **High:** Lack of pagination on `GET /api/notifications`.
- **Medium:** No email fallback for critical offline events (mentions, assignments).
- **Low:** Users cannot permanently delete notifications, causing database bloat over time.

### 🚀 Improvement Proposals
| Priority | Improvement | Effort | Impact |
|---|---|---|---|
| High | Implement cursor-based pagination on `GET /api/notifications` and wire up infinite scroll in `ScrollArea`. | Medium | Solves the hidden unread notification bug caused by 20-item limits and client-side filtering. |
| High | Add an email service provider (Resend/SendGrid) for @mentions when `user.status === 'OFFLINE'`. | Large | Guarantees users don't miss critical pings when the app is closed. |
| Med | Move filtering logic to the database (`GET /api/notifications?filter=unread`) instead of relying on client-side JS. | Small | Accurate counts and accurate filtering across infinite histories. |
| Low | Add a "Clear All" API payload that invokes `prisma.notification.deleteMany({where: {userId}})`. | Small | Allows users to maintain inbox zero and reduces row bloat. |

---

## AREA 2: Kanban Board

### 🔍 Current State
- **Drag & Drop:** Implemented purely with `@dnd-kit/core` and `@dnd-kit/sortable` across `KanbanColumn.tsx` and `KanbanCard.tsx`. Uses `SortableContext` with `verticalListSortingStrategy`.
- **WIP Limits:** Enforced visually at the UI level only. In `KanbanColumn.tsx`, if `length > wipLimit`, it displays a red `bg-red-500/15` badge and `WIP X` label, but does not block the drop. 
- **Dependencies:** Visible only via a read-only badge on `KanbanCard.tsx` (showing a `Link2` or `AlertCircle` icon next to `card.dependencyCount`). No dependency graph UI or blocking logic during dnd.
- **Epics:** Modeled separately (`Epic` in schema), but rendered inline on individual cards as a color-coded pill badge. Reached via a separate `/epics` router link in the sidebar.
- **Backlog:** Rendered in a separate `BacklogPanel.tsx` component. Cards mapped dynamically via the `isBacklog` boolean.
- **Real-Time Sync:** Extensive WebSockets via `src/socket/handlers/kanban.ts`. Handlers broadcast `card-moved`, `card-created`, `card-updated`, `checklist-item-toggled`, etc.
- **Subtasks:** Visual only. Rendered via `subtaskCount` and `subtaskCompleted` stats on the parent `KanbanCard`. `SubtaskList.tsx` manages the array, but they cannot be dragged onto the main board.
- **Modals:** Heavy lifting done in `CardDetailModal.tsx` which houses full editing, checklist inputs, and comment inputs.
- **GitHub:** `GitHubIntegration` exists in the schema (webhook secrets, repo tracking) but the pipeline lacks deep integration components locally; likely designed to listen to generic webhook pushes.

### ⚠️ Gaps & Issues
- **High:** WIP limits are client-side UI illusions; the API does not validate drops against column density.
- **Med:** Subtasks are rigid and behave like glorified checklists, they cannot exist as independent items on the board.
- **Low:** Moving a card that has `isBlocked: true` (a dependency issue) doesn't alert the user or restrict the drag action.

### 🚀 Improvement Proposals
| Priority | Improvement | Effort | Impact |
|---|---|---|---|
| High | Server-side WIP enforcement: Block the `PUT /api/cards/move` action and revert the drag if target column is full. | Small | Enforces actual Kanban methodology strictly. |
| Med | Implement dependency arrows or a "Blocker" modal warning when a user tries to drag an `isBlocked: true` card out of To-Do. | Med | Prevents chronological workflow violations. |
| Med | Add GitHub Webhook parsers in an API route to auto-move cards with "Fixes KAN-123" in PR descriptions. | Large | Brings automation parity comparable to Linear/Jira. |

---

## AREA 3: Analytics Dashboard

### 🔍 Current State
- **Metrics Tracked:** Total tasks, completed tasks, estimated vs completed story points, logged time, velocity, and member workload distributions.
- **Charting Library:** Pure manual `<svg>` implementation! Found inside `src/app/workspace/[slug]/analytics/page.tsx` directly rendering custom rects, paths, and circles for Velocity bar charts and Completion rings. No `recharts` or `chart.js`.
- **Real-time Status:** Single batch load. Fetched once on mount via `GET /api/workspaces/[slug]/analytics`. No socket bindings for real-time chart updating exist.
- **Date Filtering:** Missing entirely. The UI blindly charts whatever payload the API sends back with no input controls for standard ranges (e.g., 7 days, 30 days).
- **Per-Member Productivity:** Yes, a "Member Workload" section exists showing total cards, points, time logged, and a percentage progress bar per avatar.
- **Velocity:** Tracks Story Points per week across a custom 5-week `<svg>` bar chart view.
- **Workspace Specific:** Analytics are strictly scoped wrapper-wide to the Workspace, failing to allow drill-downs per-board or per-channel.
- **Exporting:** Non-existent. No CSV or PDF export logic built in.

### ⚠️ Gaps & Issues
- **High:** Hand-rolling SVG charts is highly brittle and unscalable for responsive design complexities or tooltip additions.
- **Med:** Absolute lack of Date Range filters leaves managers unable to scope sprints or analyze targeted windows.
- **Low:** Cannot export tables or charts for external stakeholder reporting.

### 🚀 Improvement Proposals
| Priority | Improvement | Effort | Impact |
|---|---|---|---|
| High | Migrate the custom SVG charts to a robust headless library like `Recharts` to gain responsive tooltips and standard formatting. | Med | Massive boost to UX, readability, and immediate maintainability. |
| Med | Add a date range picker component (e.g., last 7, 30, 90 days) passing a `?dateStart=xxx` query down to the API. | Small | Unlocks temporal precision for project managers. |
| Low | Add a "Download CSV" trigger that converts the raw JSON API response payload into a browser-native CSV blob object. | Small | High value feature for Enterprise use cases requiring reporting. |

---

## AREA 4: Sidebar & Global Navigation Components

### 🔍 Current State
- **Organization & Content:** Found in `WorkspaceSidebar.tsx` displaying: Dashboard, Epics, Kanban, Chat, Video, Whiteboard, Analytics, Members, Settings. It uniquely nests a `<DocumentTree />` directly underneath the flat standard nav indicating a "Wiki" structure. 
- **Responsiveness:** Masterfully dual-component layout. Desktop uses `hidden lg:flex w-64`, while Mobile wraps the identical `<SidebarContent />` inside a Radix UI `<Sheet>` from `MobileSidebar`.
- **Workspace Switching:** Navigated securely via a dedicated `WorkspaceSwitcher` component.
- **Unread Counts:** Conspicuously absent on the global navigation layer. "Chat" nor "Kanban" display any unread badge numerical indicators at the root Sidebar level.
- **Command Palette:** Exists and highly functional. `<CommandPalette />` bound to `Cmd+K`, fetches from `/api/search` natively traversing Documents, Channels, Cards, and Members recursively.
- **Direct Messages:** Not surfaced in the global sidebar explicitly; DMs are managed by clicking "Chat" first, then utilizing an inner-chat layout selector.
- **Drag-to-Reorder:** Not supported on global sidebar sections or document tree entries natively at this root level.
- **UI Primitives:** Borrows cleanly from `src/components/ui/` leveraging `Button`, `Avatar`, `Sheet`, `DropdownMenu`, etc. 

### ⚠️ Gaps & Issues
- **High:** Deep two-click penalty for DMs. Users can't see who messaged them from the global sidebar without entering the Chat module first.
- **Med:** Zero root-level badging indicates teams don't know if something is happening across the workspace unless they stare at the bell or visit the specific feature route.
- **Low:** Fixed navigation structure penalizes teams only using 1 or 2 tools instead of the full suite.

### 🚀 Improvement Proposals
| Priority | Improvement | Effort | Impact |
|---|---|---|---|
| High | Hoist unread DM state flags out of the Chat module and mount them directly next to the "Chat" label in `WorkspaceSidebar.tsx`. | Med | Instantly boosts visibility of missed messages and app retention. |
| Med | Render active/recent DMs directly in the global Sidebar below the `DocumentTree` using a collapsible accordion. | Large | Brings native Slack parity by surfacing humans alongside tools globally. |
| Low | Allow admins to toggle visibility of tools (Disable Kanban, Disable Video) via a new table storing `disabledFeatures: string[]`. | Med | Reduces noise drastically for simple Wiki/Chat teams. |
