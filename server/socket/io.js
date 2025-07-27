import { Server } from "socket.io";

let ioInstance = null;

export function initIO(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: { origin: "*" },
  });
  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO instance has not been initialized");
  }
  return ioInstance;
}
