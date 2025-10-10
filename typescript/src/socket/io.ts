import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";

let ioInstance: SocketIOServer | null = null;

/**
 * Initializes and stores a singleton Socket.IO server instance.
 */
export function initIO(httpServer: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });
  return ioInstance;
}

/**
 * Retrieves the existing Socket.IO server instance.
 * Throws if `initIO` hasn't been called yet.
 */
export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error("Socket.IO instance has not been initialized");
  }
  return ioInstance;
}
