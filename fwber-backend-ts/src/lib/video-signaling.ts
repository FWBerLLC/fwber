/**
 * 1-on-1 Video Call WebRTC signaling — shared validation + event shaping.
 *
 * `VideoCallModal.tsx` and `use-pusher-logic.ts` exchange WebRTC SDP offers/answers,
 * ICE candidates, and call teardown (`bye`) via:
 *   POST /api/video/signal { recipient_id, signal: { type, sdp?, candidate? }, call_id? }
 * or over Socket.IO `video_signal`, and consume `VideoCallSignal` events shaped:
 *   { from_user_id: string, to_user_id: string, signal: object, call_id?: number, timestamp: string }.
 *
 * Pure validation (no I/O) keeps REST and Socket.IO rules identical and unit-testable.
 */

export const VIDEO_SIGNAL_TYPES = ['offer', 'answer', 'candidate', 'ice-candidate', 'bye', 'hangup', 'ringing'] as const;
export type VideoSignalType = (typeof VIDEO_SIGNAL_TYPES)[number];

export const VIDEO_SIGNAL_EVENT = 'VideoCallSignal';

export interface ValidatedVideoSignal {
  targetUserId: number;
  callId?: number;
  signal: {
    type: VideoSignalType;
    sdp?: any;
    candidate?: any;
  };
}

export interface VideoCallSignalEvent {
  from_user_id: string;
  to_user_id: string;
  signal: {
    type: VideoSignalType;
    sdp?: any;
    candidate?: any;
  };
  call_id?: number;
  timestamp: string;
}

export type ValidateVideoResult =
  | { ok: true; value: ValidatedVideoSignal }
  | { ok: false; error: string };

function isPlainObject(v: any): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateVideoSignal(body: any, senderId: number): ValidateVideoResult {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Signal body must be a JSON object' };
  }

  const rawTarget = body.recipient_id ?? body.receiver_id ?? body.target_user_id ?? body.to_user_id;
  const targetUserId = Number(rawTarget);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, error: 'recipient_id must be a positive integer' };
  }
  if (targetUserId === senderId) {
    return { ok: false, error: 'Cannot send a video signal to yourself' };
  }

  const rawSignal = isPlainObject(body.signal)
    ? body.signal
    : isPlainObject(body.payload)
      ? { type: body.type, ...body.payload }
      : { type: body.type, sdp: body.sdp, candidate: body.candidate };

  const type = rawSignal.type as VideoSignalType;
  if (!VIDEO_SIGNAL_TYPES.includes(type)) {
    return { ok: false, error: `signal.type must be one of: ${VIDEO_SIGNAL_TYPES.join(', ')}` };
  }

  if (type === 'offer' || type === 'answer') {
    const sdpObj = rawSignal.sdp;
    const hasSdp =
      (typeof sdpObj === 'string' && sdpObj.length > 0) ||
      (isPlainObject(sdpObj) && typeof sdpObj.sdp === 'string' && sdpObj.sdp.length > 0);
    if (!hasSdp) {
      return { ok: false, error: `${type} requires an SDP description` };
    }
  } else if (type === 'candidate' || type === 'ice-candidate') {
    const cand = rawSignal.candidate;
    const hasCand =
      (typeof cand === 'string' && cand.length > 0) ||
      (isPlainObject(cand) && typeof cand.candidate === 'string');
    if (!hasCand) {
      return { ok: false, error: `${type} requires an ICE candidate payload` };
    }
  }

  let callId: number | undefined;
  if (body.call_id !== undefined && body.call_id !== null && body.call_id !== '') {
    const parsedCallId = Number(body.call_id);
    if (!Number.isInteger(parsedCallId) || parsedCallId <= 0) {
      return { ok: false, error: 'call_id must be a positive integer when provided' };
    }
    callId = parsedCallId;
  }

  return {
    ok: true,
    value: {
      targetUserId,
      ...(callId !== undefined ? { callId } : {}),
      signal: {
        type,
        ...(rawSignal.sdp !== undefined ? { sdp: rawSignal.sdp } : {}),
        ...(rawSignal.candidate !== undefined ? { candidate: rawSignal.candidate } : {}),
      },
    },
  };
}

export function buildVideoSignalEvent(
  senderId: number,
  validated: ValidatedVideoSignal
): VideoCallSignalEvent {
  return {
    from_user_id: String(senderId),
    to_user_id: String(validated.targetUserId),
    signal: validated.signal,
    ...(validated.callId ? { call_id: validated.callId } : {}),
    timestamp: new Date().toISOString(),
  };
}
