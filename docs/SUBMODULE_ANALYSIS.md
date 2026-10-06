# Submodule & Logical Package Analysis

This document evaluates the active logical packages (formerly submodules) within the fwber monorepo to determine their redundancy and implementation status.

## 1. fwber-geo (Rust)
- **Features**: High-speed H3 spatial indexing, nearby user lookup, O(1) grid traversal.
- **Functionality**:
  - `POST /index`: Maps user_id to H3 cell.
  - `GET /nearby`: Calculates k-ring disk to find users in adjacent cells.
- **Status**: **NOT REDUNDANT**. While `fwber-backend-ts` uses `h3-js` for Bloom filter shortcuts, the Rust service provides the high-performance in-memory spatial index required for dense proximity calculations.
- **Implementation**: Fully implemented as a standalone microservice. Wired to the TS backend via `GeoScreenerService.ts`.

## 2. fwber-wasm (Rust/WASM)
- **Features**: High-performance AES-256-GCM encryption/decryption.
- **Functionality**: Offloads cryptographic primitives from JS to Rust/WASM for large message payloads.
- **Status**: **ACTIVE LIBRARY**. Should remain as a source directory for building WASM artifacts used by the frontend.
- **Implementation**: Primitives exist in `lib.rs`. Frontend integration is planned for high-load E2E scenarios.

## 3. mobile (React Native / Expo)
- **Features**: Native WebView wrapper with bridges for Location, Notifications, and NFC.
- **Functionality**:
  - Native NFC read/write bridge.
  - Native Push Notification forwarding.
  - Native Location permissions.
- **Status**: **ACTIVE COMPONENT**. Provides the essential native bridge for hardware features (NFC) that PWA cannot yet handle with 100% reliability across iOS/Android.
- **Implementation**: Fully functional Expo app pointing to `fwber.site`.

## 4. ARCHIVE_v1_8_php_legacy
- **Features**: Retired Laravel backend, old migration scripts, and stress tests.
- **Status**: **REDUNDANT**. This directory contains retired systems preserved only for reference during the TypeScript migration.
- **Action**: Mark for removal after ensuring all unique logic (e.g., specific stress test patterns) has been documented or ported.

## 5. fwber-backend (Legacy Stub)
- **Status**: **REDUNDANT**. Only contains a VERSION file. All logic is now in `fwber-backend-ts`.
- **Action**: Immediate removal.

---
**Summary**: The monorepo has been unified. Remaining directories are active logical components of the stack, not "submodules" in the git sense.
