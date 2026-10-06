# Backend Port: TypeScript/Node.js Migration (v2.0.0-ts)

## Overview
The backend has been migrated from a legacy PHP/Laravel architecture to a modern, type-safe TypeScript/Node.js stack. This migration was driven by the need for better performance, structural integrity, and shared type definitions between the frontend and backend.

## Architecture
- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **ORM**: Prisma
- **Validation**: Zod
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens) with port-over of original "Decoy" logic.

## Key Changes
- **Directory Structure**: All backend logic is now contained within `fwber-backend-ts/`.
- **Database Schema**: Ported 70+ Laravel models into a unified `prisma/schema.prisma`.
- **Real-time Engine**: Replaced Laravel Echo/Pusher with a native Socket.io implementation.
- **Service Layer**: Rewritten core logic (Matching, Geo-screening, ZK-ID, Tokens) in TypeScript.

## Frontend Integration
- The frontend `apiClient` now defaults to `http://localhost:4000` (development) or `https://api.fwber.site/api` (production).
- The `useWebSocket` hook has been refactored to use `socket.io-client` while maintaining the existing API for UI components.

## Deployment
- **Frontend**: Vercel (Auto-deployed from `fwber-frontend/`)
- **Backend**: Hetzner VPS (Auto-deployed via GitHub Actions to `fwber-backend-ts/`)
- **Process Management**: Managed via PM2 on the remote server.

## Status
Migration is **100% complete** as of v2.0.0-ts. Legacy PHP code in `fwber-backend/` is retained for reference but is no longer the production source.
