import React, { useState, useEffect } from "react";
import io from "socket.io-client";
// eslint-disable-next-line no-unused-vars
import { FaDiscord, FaGlobe, FaUser } from "react-icons/fa";

const SERVER_URL = "http://localhost:5000";
const socket = io(SERVER_URL);

const ServerChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    socket.on("chatMessage", (message) => {
      console.log("🟢 chatMessage received:", JSON.stringify(message));
      setMessages((prev) => [...prev, message]);
    });

    socket.on("chatHistory", (history) => {
      console.log(
        "📜 chatHistory received:",
        history.map((m, i) => `[${i}]: ${m}`)
      );
      setMessages(history);
    });

    return () => {
      socket.off("chatMessage");
      socket.off("chatHistory");
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();

    const now = Date.now();
    const secondsSinceLast = (now - lastSent) / 1000;

    if (secondsSinceLast < 10) {
      setCooldownRemaining(Math.ceil(10 - secondsSinceLast));
      return;
    }

    if (input.trim()) {
      socket.emit("sendChatMessage", input.trim());
      setLastSent(now);
      setCooldownRemaining(0);
      setInput("");
    }
  };

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(prev - 1, 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const getMessageParts = (msg) => {
    if (typeof msg !== "string") {
      return { type: "generic", content: String(msg) };
    }

    // 🔧 Strip `[Minecraft-Chat]:` prefix (with optional space)
    msg = msg.replace(/^\[Minecraft-Chat\]:\s*/, "");

    // ✅ Web message
    if (msg.startsWith("[Web]")) {
      return { type: "web", content: msg.replace("[Web] ", "") };
    }

    // ✅ Minecraft message: `<username>` message
    const mcMatch = msg.match(/^`?<(.+?)>`?\s+(.*)$/);
    if (mcMatch) {
      return {
        type: "minecraft",
        name: mcMatch[1],
        content: mcMatch[2],
      };
    }

    // ✅ Discord message: [username]: message
    const discordMatch = msg.match(/^\[(.+?)\]:\s*(.*)$/);
    if (discordMatch) {
      return {
        type: "discord",
        name: discordMatch[1],
        content: discordMatch[2],
      };
    }

    // 🧯 Fallback
    return { type: "generic", content: msg };
  };

  return (
    <div className="server-chat container mt-3">
      <div className="alert alert-warning" role="alert">
        Chat is not fully implemented yet. Only sending messages to the server
        work.
      </div>

      <h2>Server Chat</h2>

      <div className="chat-messages mb-3">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet.</div>
        ) : (
          messages.map((msg, index) => {
            const { type, name, content } = getMessageParts(msg);
            console.log(`🔍 Parsing [${index}]:`, msg); // Add this

            return (
              <div key={index} className={`chat-message message-${type}`}>
                {type === "minecraft" && (
                  <>
                    <img
                      src={`https://minotar.net/avatar/${name}/32`}
                      alt={name}
                      className="avatar"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                    <strong className="msg-name">{name}</strong> &gt; {content}
                  </>
                )}

                {type === "discord" && (
                  <>
                    <FaDiscord className="icon discord-icon" />
                    <strong className="msg-name">{name}</strong> &gt; {content}
                  </>
                )}

                {type === "web" && (
                  <>
                    <FaGlobe className="icon web-icon" />
                    <strong className="msg-name">web</strong> &gt; {content}
                  </>
                )}

                {type === "generic" && (
                  <span style={{ fontStyle: "italic", color: "#aaa" }}>
                    {typeof msg === "string" ? msg : JSON.stringify(msg)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage} className="chat-form d-flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="chat-input form-control me-2"
        />
        <button type="submit" className="chat-send-button btn btn-primary">
          Send
        </button>
      </form>
      {cooldownRemaining > 0 && (
        <div className="text-warning mt-2">
          Please wait {cooldownRemaining}s before sending another message.
        </div>
      )}
    </div>
  );
};

export default ServerChat;
