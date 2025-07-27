import chatMessageHandler from "./chatMessage.js";
import requestHistoryHandler from "./requestHistory.js";
import disconnectHandler from "./disconnect.js";

export function registerSocketHandlers(socket, { db, io, client, webBot }) {
  socket.on("sendChatMessage", (data) =>
    chatMessageHandler(socket, data, db, io, webBot)
  );

  socket.on("requestChatHistory", () => requestHistoryHandler(socket, webBot));

  socket.on("disconnect", () => disconnectHandler(socket));
}
