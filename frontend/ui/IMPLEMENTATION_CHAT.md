# Implementation Plan: Chat Interface with Nanobot

This document outlines the step-by-step plan to integrate a chat interface into the existing Next.js frontend, connecting authenticated users to their specific nanobot agent via the gateway.

## Goal
Create a modern, responsive chat interface using Next.js App Router, Tailwind CSS, Shadcn UI, and the Vercel AI SDK.

## Architecture Decisions
1.  **Framework**: Next.js App Router.
2.  **Styling**: Tailwind CSS + Shadcn UI.
3.  **State Management**: `useChat` hook from Vercel AI SDK (handles streaming, optimistic UI).
4.  **Backend Proxy**: Next.js API Routes (`app/api/chat/route.ts`) will proxy requests to the internal Gateway (`http://localhost:8080`), hiding the internal Docker architecture and handling CORS.
5.  **User Mapping**:
    -   Users are authenticated via Supabase.
    -   The backend Gateway expects an `X-User-ID` header to route to `agent-{ID}`.
    -   **Strategy**: We will map the logged-in user to a specific agent ID (e.g., `agent-1` for now, or based on username/email).

## Checkpoints

### Phase 1: Setup & Dependencies
- [x] **Install Core Dependencies**
    -   `ai` (Vercel AI SDK)
    -   `lucide-react` (Icons)
    -   `clsx`, `tailwind-merge` (Utilities)
- [x] **Initialize Shadcn UI**
    -   Run `npx shadcn@latest init`
    -   Configure `components.json`
- [x] **Add UI Components**
    -   `npx shadcn@latest add button input card scroll-area avatar separator`

### Phase 2: Backend Proxy (API Route)
- [x] **Create API Route** (`src/app/api/chat/route.ts`)
    -   Implement POST handler.
    -   Authenticate user via Supabase (SSR).
    -   Determine `X-User-ID` (e.g., hardcode to "1" or derive from email).
    -   Forward request to `http://127.0.0.1:8080/chat` (Gateway).
    -   Handle streaming response from Gateway (if supported) or standard JSON response.
    -   Return response to frontend.

### Phase 3: UI Implementation
- [x] **Create Chat Layout** (`src/components/chat/chat-layout.tsx`)
    -   Sidebar for file uploads/history (placeholder).
    -   Main chat area.
- [x] **Create Message Component** (`src/components/chat/chat-message.tsx`)
    -   Display user vs. agent messages with different styles/avatars.
    -   Render Markdown content (optional but recommended).
- [x] **Create Chat Interface** (`src/components/chat/chat-interface.tsx`)
    -   Integrate `useChat` hook.
    -   Connect to `/api/chat`.
    -   Handle loading states.
- [x] **Update Dashboard** (`src/app/(app)/dashboard/page.tsx`)
    -   Replace current "Welcome" text with the `ChatInterface` component.

### Phase 4: File Upload (Bonus/Next Step)
- [x] **Create Upload Component**
    -   File input or drag-and-drop.
    -   API route for uploads (`/api/upload`) proxying to Gateway `/uploads`.

### Phase 5: Verification
- [ ] **Authentication Check**: Ensure only logged-in users can access the chat.
- [ ] **Routing Check**: Verify messages are sent to the correct agent via Gateway.
- [ ] **UI Responsiveness**: Check mobile vs. desktop layout.
- [ ] **Error Handling**: Graceful handling of Gateway downtime or agent errors.
