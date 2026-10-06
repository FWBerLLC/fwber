import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import prisma from './lib/prisma.js';

interface AuthenticatedSocket extends Socket {
  user?: { id: number; name: string; };
}

// Global io instance for use in other modules
let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function setupSocketIO(httpServer: any) {
  const io = new Server(httpServer, {
    path: '/socket.io/',
    addTrailingSlash: true,
    transports: ['websocket', 'polling'],
    cors: {
      origin: [
        'https://www.fwber.site',
        'https://fwber.site',
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      const user = await prisma.users.findUnique({
        where: { id: BigInt(decoded.id) },
        select: { id: true, name: true },
      });
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      socket.user = { id: Number(user.id), name: user.name };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.io] User connected: ${socket.user?.name} (ID: ${socket.user?.id})`);

    // Join user-specific room for private messages
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('join_room', (roomId: string) => {
        socket.join(`room:${roomId}`);
        console.log(`[Socket.io] User ${socket.user?.id} joined room ${roomId}`);
    });

    socket.on('leave_room', (roomId: string) => {
        socket.leave(`room:${roomId}`);
        console.log(`[Socket.io] User ${socket.user?.id} left room ${roomId}`);
    });

    socket.on('send_room_message', async (data: { roomId: string, content: string }) => {
        if (!socket.user) return;
        io.to(`room:${data.roomId}`).emit('new_room_message', {
            roomId: data.roomId,
            senderId: socket.user.id,
            content: data.content,
            createdAt: new Date().toISOString()
        });
    });


    // Handle real-time messaging
    socket.on('send_message', async (data: { receiverId: number; content: string }) => {
      if (!socket.user) return;
      try {
        const message = await prisma.messages.create({
          data: {
            sender_id: BigInt(socket.user.id),
            receiver_id: BigInt(data.receiverId),
            content: data.content,
            sent_at: new Date(),
          },
        });

        // Emit to receiver's private room
        io.to(`user:${data.receiverId}`).emit('new_message', {
          id: Number(message.id),
          senderId: socket.user.id,
          content: message.content,
          createdAt: message.created_at,
        });

        // Ack to sender
        socket.emit('message_sent', { id: Number(message.id) });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('typing', (data: { receiverId: number }) => {
      if (!socket.user) return;
      io.to(`user:${data.receiverId}`).emit('user_typing', { senderId: socket.user.id });
    });

    // Handle stop typing
    socket.on('stop_typing', (data: { receiverId: number }) => {
      if (!socket.user) return;
      io.to(`user:${data.receiverId}`).emit('user_stop_typing', { senderId: socket.user.id });
    });

    // Handle read receipts
    socket.on('mark_read', (data: { senderId: number }) => {
      if (!socket.user) return;
      io.to(`user:${data.senderId}`).emit('messages_read', { readerId: socket.user.id });
    });

    // Handle online/offline status
    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.user?.id}`);
      if (socket.user) {
        socket.broadcast.emit('user_offline', { userId: socket.user.id });
      }
    });
  });

  return io;
}

/**
 * Push a real-time notification to a specific user
 */
export function pushToUser(userId: number, event: string, data: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Push a new match notification to both users
 */
export function pushMatchNotification(user1Id: number, user2Id: number, matchData: any) {
  pushToUser(user1Id, 'new_match', matchData);
  pushToUser(user2Id, 'new_match', matchData);
}

/**
 * Push a notification event
 */
export function pushNotification(userId: number, notification: any) {
  pushToUser(userId, 'notification', notification);
}
