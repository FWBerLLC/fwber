# Realtime: Socket Badge Fix + Middle-School Presence Spec

> **Date:** 2026-10-28 · **Agent:** Pi (`[mimo-v2.6-pro in pi in ~/workspace/fwber]`)
> **Status:** SPEC ONLY — no code changed, nothing deployed. Awaits Robert's word.
> **Evidence basis:** file reads (exact refs below) + live CDP probes (badge green on fresh load,
> red Offline branch correct under emulated offline, green recovery on restore, transport sniff
> `wss://fwber.online/socket.io/?EIO=4&transport=websocket`, `POST /api/websocket/connect` → 200).
> Kill-test for terminal give-up NOT achieved (CDP cannot kill WS upgrades in this Edge build) —
> those findings stay labeled analysis, with prior gray screenshots as observational evidence.

## Part 1 — Badge data flow (corrected)

`ConnectionStatusBadge` (`components/realtime/PresenceComponents.tsx:196`) reads PresenceContext,
fed by `AuthenticatedRealtimeProvider` (`app/layout.tsx:126`, layout-level) → `useWebSocket`
(`lib/hooks/use-websocket.ts`) which returns **hardcoded**
`{ connecting:false, configured:true, reconnectAttempts:0 }` with live `connected` from the
**socket.io singleton** (`lib/hooks/use-socket-logic.ts`). Production badge is binary green/gray;
Reconnecting/Connecting branches are dead code via this path. (A second native-WS stack,
`lib/websocket/client.ts` + `useWebSocketLogic`, also auto-connects — e.g. `messages/page.tsx`
mounts both. Two connections per session.)

## Part 2 — Socket fix spec (v2, held)

1. **Surface real retry state.** Thread socket.io `reconnect_attempt` / `reconnect_failed` into
   `connectionStatus` (stop hardcoding `reconnectAttempts: 0`); set `connecting: true` on attempt
   start so the blue branch renders. Gray then means exactly "never attempted / fresh mount".
2. **Recoverable give-up.** On `reconnect_failed`: null the dead `_socket` (defeats the
   `if (_socket || !token) return` guard in `connect()`) and either schedule gentle uncapped
   retry or expose badge-click manual retry with attempts reset. No silent terminal state.
3. **Mount/auth-flap guard.** `AuthenticatedRealtimeProvider` renders bare children when
   `!isAuthenticated`; auth rehydration flaps remount PresenceProvider and reset badge state.
   Hold last-known state across brief unauthenticated windows; audit autoConnect mount/unmount
   balance for the `_connectionCount` ref-count.
4. **Transport.** Add polling fallback to the singleton (`transports: ['websocket','polling']`).
5. **Consolidate.** Long term: kill one stack (native WS client vs socket.io singleton).

## Part 3 — Middle-school presence spec

Goal: every client recognizes every other client, with privacy.

1. **Hello.** On `connection`, server `broadcast.emit('user_online', { userId })` — symmetric
   with existing `user_offline` (`src/socket.ts:136`). Biggest gap, ~1 line.
2. **Attendance sheet.** Server keeps authoritative online set (in-memory now; Redis set when
   past one PM2 worker). New connection receives full roster; all receive deltas.
3. **Re-announce on reconnect.** Full re-join sequence after every reconnect (never assume prior
   state). Heals automatically once the Part 2 fix lands — a give-up-stuck client is invisible
   to everyone, not just itself.
4. **Server-side roster filtering.** Apply Ghost Mode ("only be seen by people you like"),
   blocks, and Location Fuzzing *before* broadcast. Never trust the client to hide itself.
5. **Stale-socket expiry.** Heartbeat timeout sweep so crashed clients get marked absent.
6. **Rooms.** Global hallway (all clients) + classrooms (event rooms via existing
   `join_event`/`update_location`, chat rooms via `join_room`) — same hello/roster/delta
   contract at each scope.

## Verification contract (for whoever implements)

- Fresh load → green within N s; kill transport pre-give-up → yellow retry → green on restore.
- Kill transport past give-up → defined terminal UI + manual retry recovers (no remount needed).
- Roster: join → full list; join/leave → deltas within 1 heartbeat; ghost/blocked users absent
  from others' rosters; fuzzed locations coarse.
- Suite stays 93/93, tsc 0, no new deps (socket.io already present).

## Open decisions (Robert's)

- Implement Part 2 now / with Part 3 as one package / neither yet.
- Backup target+credential (unchanged blocker).
- Artifact review scope for Muse (tooltip-only vs +react-leaflet) — held until Robert says so
  in main chat.
