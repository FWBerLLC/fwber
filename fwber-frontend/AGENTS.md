<!-- [HYPERNEXUS_AUTO_INJECTED] -->
> [!IMPORTANT]
> You are running within the HyperNexus environment. You MUST use your available tools frequently and proactively for researching, editing, executing, and validating your work. Always prioritize tool execution.

# Frontend Agent Instructions

> **Context:** `fwber-frontend` (Next.js 14 App Router)

## 🧠 Component Context
This directory contains the user interface, client-side logic, and server-side rendering code. It is built with Next.js 14, React 18, and TypeScript.

## 🛠️ Key Commands
- **Dev:** `npm run dev`
- **Build:** `npm run build` (Must pass before commit)
- **Lint:** `npm run lint`
- **Type Check:** `npm run type-check`
- **E2E Tests:** `npx cypress run` (or `npm run test:e2e`)

## 📜 Standards & Conventions
- **Testing:** Use Cypress for End-to-End testing. Run specific suites via `npm run test:e2e:[suite]`.
- **Strict Mode:** React Strict Mode is enabled; components must be resilient to double-mounting.

## 🏗️ Architecture & Patterns
- **App Router:** Use `app/` directory structure.
- **Server Components:** Default to Server Components (`.tsx`). Use `'use client'` explicitly only when hooks/state are needed.
- **UI Library:** Shadcn/UI + Tailwind CSS. Do not invent new styles; compose existing utilities.
- **State Management:** URL state preferred for sharable UI. Zustand for global client state. React Query for async data.
- **Realtime:** Use `useReverbLogic` hook for websocket connections.

## 🚨 Critical Rules
1.  **Strict TypeScript:** No `any`. Define interfaces in `types/` or co-located if specific.
2.  **No Direct API Calls:** Use the configured Axios client in `lib/api`.
3.  **Mobile First:** All UI must be fully responsive.
4.  **Accessibility:** Ensure all interactive elements have `aria-` attributes where standard HTML elements aren't sufficient.

## 🧪 Verification
- Run `npm run build` to ensure type safety and build validity.
- Run `npm run lint` to catch stylistic issues.
