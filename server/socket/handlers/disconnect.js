import logger from "../../logger.js";

export default function disconnectHandler(socket) {
  logger.info("Socket disconnected:", socket.id);
}
