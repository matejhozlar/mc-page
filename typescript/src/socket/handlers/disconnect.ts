import type { Socket } from "socket.io";
import logger from "../../logger";

export default function disconnectHandler(socket: Socket): void {
  logger.info(`Socket disconnected: ${socket.id}`);
}
