import { describe, it, expect } from '@jest/globals';
import { validateAudioSignal, buildAudioSignalEvent, buildParticipantJoinedEvent, buildParticipantLeftEvent, AUDIO_SIGNAL_TYPES } from '../src/lib/audio-signaling.js';

// Audio Rooms signaling contract (frontend useWebRTC + room page):
//   POST /api/audio-rooms/:id/signal { target_user_id, type, payload }
//   -> relayed as `AudioRoomSignal` { room_id, sender_id, type, payload }
// Types in use: offer / answer (payload = RTCSessionDescription),
// ice-candidate (payload = RTCIceCandidate), raise-hand (payload {}).
describe('validateAudioSignal', () => {
  it('accepts an offer with an SDP payload', () => {
    const r = validateAudioSignal({ target_user_id: 42, type: 'offer', payload: { type: 'offer', sdp: 'v=0...' } }, 7);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.signal.targetUserId).toBe(42);
      expect(r.signal.type).toBe('offer');
    }
  });

  it('accepts answer and ice-candidate signals', () => {
    expect(validateAudioSignal({ target_user_id: 42, type: 'answer', payload: { type: 'answer', sdp: 'v=0...' } }, 7).ok).toBe(true);
    expect(validateAudioSignal({ target_user_id: 42, type: 'ice-candidate', payload: { candidate: 'candidate:1 1 udp ...' } }, 7).ok).toBe(true);
  });

  it('accepts raise-hand without an SDP payload', () => {
    expect(validateAudioSignal({ target_user_id: 42, type: 'raise-hand', payload: {} }, 7).ok).toBe(true);
    expect(validateAudioSignal({ target_user_id: 42, type: 'raise-hand' }, 7).ok).toBe(true);
  });

  it('rejects unknown signal types', () => {
    const r = validateAudioSignal({ target_user_id: 42, type: 'teleport', payload: {} }, 7);
    expect(r.ok).toBe(false);
  });

  it('rejects a missing or invalid target', () => {
    expect(validateAudioSignal({ type: 'offer', payload: { sdp: 'x' } }, 7).ok).toBe(false);
    expect(validateAudioSignal({ target_user_id: 'abc', type: 'offer', payload: { sdp: 'x' } }, 7).ok).toBe(false);
    expect(validateAudioSignal({ target_user_id: 0, type: 'offer', payload: { sdp: 'x' } }, 7).ok).toBe(false);
  });

  it('rejects signaling yourself', () => {
    expect(validateAudioSignal({ target_user_id: 7, type: 'offer', payload: { sdp: 'x' } }, 7).ok).toBe(false);
  });

  it('rejects offer/answer without an SDP payload and ice without a candidate', () => {
    expect(validateAudioSignal({ target_user_id: 42, type: 'offer' }, 7).ok).toBe(false);
    expect(validateAudioSignal({ target_user_id: 42, type: 'answer', payload: {} }, 7).ok).toBe(false);
    expect(validateAudioSignal({ target_user_id: 42, type: 'ice-candidate', payload: {} }, 7).ok).toBe(false);
  });

  it('exposes exactly the signal types the frontend sends', () => {
    expect([...AUDIO_SIGNAL_TYPES].sort()).toEqual(['answer', 'ice-candidate', 'offer', 'raise-hand']);
  });
});

describe('participant presence events', () => {
  it('shapes ParticipantJoined with the fields the room page reads', () => {
    const e = buildParticipantJoinedEvent(99, { user_id: 42, name: 'Ada', role: 'speaker', is_muted: false });
    expect(e).toEqual({ room_id: 99, participant: { user_id: 42, name: 'Ada', role: 'speaker', is_muted: false } });
  });

  it('defaults muted to true and name to null for listeners', () => {
    const e = buildParticipantJoinedEvent(99, { user_id: 42, role: 'listener' });
    expect(e.participant.is_muted).toBe(true);
    expect(e.participant.name).toBeNull();
  });

  it('shapes ParticipantLeft with room and user ids', () => {
    expect(buildParticipantLeftEvent(99, 42)).toEqual({ room_id: 99, user_id: 42 });
  });
});

describe('buildAudioSignalEvent', () => {
  it('shapes the event the frontend AudioRoomSignal listener consumes', () => {
    const r = validateAudioSignal({ target_user_id: 42, type: 'offer', payload: { type: 'offer', sdp: 'v=0...' } }, 7);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const e = buildAudioSignalEvent(99, 7, r.signal);
      expect(e).toEqual({ room_id: 99, sender_id: 7, type: 'offer', payload: { type: 'offer', sdp: 'v=0...' } });
    }
  });
});
