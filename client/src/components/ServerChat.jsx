import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { FaDiscord, FaGlobe } from "react-icons/fa";

const SERVER_URL = "http://localhost:5000";
const socket = io(SERVER_URL);

const ServerChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const chatEndRef = useRef(null);
  const hasScrolledInitially = useRef(false);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    const handleChatMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleChatHistory = (history) => {
      setMessages(history);
      setLoading(false);
      // Scroll once on initial load
      setTimeout(() => {
        scrollToBottom();
        hasScrolledInitially.current = true;
      }, 0);
    };

    socket.on("chatMessage", handleChatMessage);
    socket.on("chatHistory", handleChatHistory);

    if (socket.connected) {
      socket.emit("requestChatHistory");
    } else {
      socket.on("connect", () => {
        socket.emit("requestChatHistory");
      });
    }

    return () => {
      socket.off("chatMessage", handleChatMessage);
      socket.off("chatHistory", handleChatHistory);
      socket.off("connect");
    };
  }, []);

  useEffect(() => {
    // Only scroll automatically on new messages if enabled and not initial scroll
    if (autoScrollEnabled && hasScrolledInitially.current) {
      scrollToBottom();
    }
  }, [messages, autoScrollEnabled]);

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

    msg = msg.replace(/^\[Createrington\]:\s*/, "");

    if (msg.startsWith("[Web]")) {
      return { type: "web", content: msg.replace("[Web] ", "") };
    }

    const mcMatch = msg.match(/^`?<(.+?)>`?\s+(.*)$/);
    if (mcMatch) {
      return {
        type: "minecraft",
        name: mcMatch[1],
        content: mcMatch[2],
      };
    }

    const discordMatch = msg.match(/^\[(.+?)\]:\s*(.*)$/);
    if (discordMatch) {
      return {
        type: "discord",
        name: discordMatch[1],
        content: discordMatch[2],
      };
    }

    return { type: "generic", content: msg };
  };

  return (
    <div className="server-chat container mt-3">
      <div className="alert alert-warning" role="alert">
        Chat is not fully implemented yet. There might be some display issues.
      </div>

      <h2 className="d-flex justify-content-between align-items-center">
        Server Chat
        <button
          className={`btn btn-sm ${
            autoScrollEnabled
              ? "btn-success btn-success-fix"
              : "btn-outline-secondary"
          }`}
          onClick={() => setAutoScrollEnabled((prev) => !prev)}
        >
          Auto-Scroll: {autoScrollEnabled ? "On" : "Off"}
        </button>
      </h2>

      <div
        className="chat-messages mb-3"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading chat...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet.</div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const { type, name, content } = getMessageParts(msg);
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
                      <strong className="msg-name">{name}</strong> &gt;{" "}
                      {content}
                    </>
                  )}
                  {type === "discord" && (
                    <>
                      <FaDiscord className="icon discord-icon" />
                      <strong className="msg-name">{name}</strong> &gt;{" "}
                      {content}
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
            })}
            <div ref={chatEndRef} />
          </>
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
