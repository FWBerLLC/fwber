/**
 * Audio Rooms WebRTC signaling — shared validation + event shaping.
 *
 * Why this module exists: the room UI (useWebRTC + audio-rooms/[id] page)
 * exchanges SDP/ICE through the backend. Senders POST
 *   /api/audio-rooms/:id/signal { target_user_id, type, payload }
 * and receivers consume an `AudioRoomSignal` event shaped
 *   { room_id, sender_id, type, payload }.
 * Until v2.3.70 the REST endpoint acknowledged without relaying, so offers
 * never reached peers. Validation lives here (pure, no I/O) so the REST
 * route and the Socket.io handler enforce identical rules and the contract
 * is unit-testable without a database or a live socket server.
 *
 * Fail-closed rules: unknown types, missing/invalid targets, self-signals,
 * and SDP-less offers/answers are rejected rather than relayed — a partial
 * signal can only wedge a peer connection in a half-open state.
 */

export const AUDIO_SIGNAL_TYPES = ['offer', 'answer', 'ice-candidate', 'raise-hand'] as const;
export type AudioSignalType = (typeof AUDIO_SIGNAL_TYPES)[number];

export interface AudioSignal {
  targetUserId: number;
  type: AudioSignalType;
  payload: any;
}

export interface AudioSignalEvent {
  room_id: number;
  sender_id: number;
  type: AudioSignalType;
  payload: any;
}

export type ValidateResult =
  | { ok: true; signal: AudioSignal }
  | { ok: false; error: string };

function isPlainObject(v: any): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateAudioSignal(body: any, senderId: number): ValidateResult {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Signal body must be a JSON object' };
  }

  const targetUserId = Number(body.target_user_id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, error: 'target_user_id must be a positive integer' };
  }
  if (targetUserId === senderId) {
    return { ok: false, error: 'Cannot send a signal to yourself' };
  }

  const type = body.type as AudioSignalType;
  if (!AUDIO_SIGNAL_TYPES.includes(type)) {
    return { ok: false, error: `type must be one of: ${AUDIO_SIGNAL_TYPES.join(', ')}` };
  }

  const payload = body.payload;
  // SDP-bearing signals are useless (and harmful) without their description;
  // ICE needs the candidate object; raise-hand is a bare notification.
  if (type === 'offer' || type === 'answer') {
    if (!isPlainObject(payload) || typeof payload.sdp !== 'string' || payload.sdp.length === 0) {
      return { ok: false, error: `${type} requires an SDP payload` };
    }
  } else if (type === 'ice-candidate') {
    if (!isPlainObject(payload) || typeof payload.candidate !== 'string' || payload.candidate.length === 0) {
      return { ok: false, error: 'ice-candidate requires a candidate payload' };
    }
  }

  return { ok: true, signal: { targetUserId, type, payload: payload ?? {} } };
}

export function buildAudioSignalEvent(roomId: number, senderId: number, signal: AudioSignal): AudioSignalEvent {
  return {
    room_id: roomId,
    sender_id: senderId,
    type: signal.type,
    payload: signal.payload,
  };
}

/** Socket.io room name that holds every connected socket of one user. */
export function userRoomName(userId: number): string {
  return `user:${userId}`;
}

/** Event name shared by the Socket.io relay and the frontend listener. */
export const AUDIO_SIGNAL_EVENT = 'AudioRoomSignal';
