import { Server } from "socket.io";

let ioInstance = null;

/**
 * Initializes and stores a singleton Socket.IO server instance.
 *
 * @param {import("http").Server} httpServer - The HTTP server to bind Socket.IO to.
 * @returns {Server} The initialized Socket.IO instance.
 */
export function initIO(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: { origin: "*" },
  });
  return ioInstance;
}

/**
 * Retrieves the existing Socket.IO server instance.
 *
 * @throws {Error} If Socket.IO has not been initialized yet via `initIO`.
 * @returns {Server} The current Socket.IO instance.
 */
export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO instance has not been initialized");
  }
  return ioInstance;
}
