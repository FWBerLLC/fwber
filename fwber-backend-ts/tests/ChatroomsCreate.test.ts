import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Chatroom creation contract: the route defaulted type to 'standard',
// which is not a chatrooms_type enum value (interest|city|event|private|
// group), so every type-less create 500'd in Prisma. Default is now
// 'group' and unknown types 400 instead of 500.

const mockRoomCreate = jest.fn(async (args: any) => ({ id: 5n, ...args.data }));
const mockMemberCreate = jest.fn(async () => ({}));

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    chatrooms: { create: mockRoomCreate, findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    chatroom_members: { create: mockMemberCreate },
  },
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: chatroomsRoutes } = await import('../src/routes/chatrooms.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/chatrooms', chatroomsRoutes);
  return app;
}

describe('POST /api/chatrooms', () => {
  beforeEach(() => { mockRoomCreate.mockClear(); mockMemberCreate.mockClear(); });

  it('defaults an omitted type to group and creates the room', async () => {
    const res = await request(buildApp()).post('/api/chatrooms').send({ name: 'No Type Room' });
    expect(res.status).toBe(200);
    expect(mockRoomCreate).toHaveBeenCalledTimes(1);
    expect((mockRoomCreate.mock.calls[0] as any)[0].data.type).toBe('group');
    expect(mockMemberCreate).toHaveBeenCalledTimes(1);
  });

  it('passes a valid explicit type through', async () => {
    const res = await request(buildApp()).post('/api/chatrooms').send({ name: 'City Room', type: 'city', category: 'Detroit' });
    expect(res.status).toBe(200);
    expect((mockRoomCreate.mock.calls[0] as any)[0].data.type).toBe('city');
  });

  it('rejects an unknown type with 400 and creates nothing', async () => {
    const res = await request(buildApp()).post('/api/chatrooms').send({ name: 'Bad Room', type: 'standard' });
    expect(res.status).toBe(400);
    expect(mockRoomCreate).not.toHaveBeenCalled();
  });

  it('still requires a name', async () => {
    const res = await request(buildApp()).post('/api/chatrooms').send({ type: 'group' });
    expect(res.status).toBe(400);
    expect(mockRoomCreate).not.toHaveBeenCalled();
  });
});
