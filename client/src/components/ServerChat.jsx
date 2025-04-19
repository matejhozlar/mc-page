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
  const [playerStatuses, setPlayerStatuses] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    const handleChatMessage = (message) => {
      const text = typeof message === "string" ? message : message?.text;
      const image = message?.image || null;

      const stripped = text
        ?.trim()
        .replace(/^\[Createrington\]:\s*/, "")
        .trim();

      // skip completely empty messages (no text, no image)
      const isEmpty = (!stripped || /^`?<[^>]+>`?$/.test(stripped)) && !image;
      if (isEmpty) return;

      setMessages((prev) => [...prev, { text, image }]);
    };

    const handleChatHistory = (history) => {
      console.log("Chat history:", history);
      setMessages(history);
      setLoading(false);
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
    const handler = (e) => {
      if (e.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const fetchPlayerStatuses = async () => {
      try {
        const res = await fetch("http://localhost:5000/players");
        const data = await res.json();
        const statuses = {};

        data.players.forEach((player) => {
          statuses[player.name] = player.online;
        });

        setPlayerStatuses(statuses);
      } catch (err) {
        console.error("Failed to fetch player statuses", err);
      }
    };

    fetchPlayerStatuses();
    const interval = setInterval(fetchPlayerStatuses, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

  const getMessageParts = (msgObj) => {
    let rawText = "";
    let image = null;

    if (typeof msgObj === "string") {
      rawText = msgObj;
    } else if (typeof msgObj === "object" && msgObj !== null) {
      rawText = msgObj.text || "";
      image = msgObj.image || null;
    }

    const msg = rawText.replace(/^\[Createrington\]:\s*/, "").trim();

    if (msg.startsWith("[Web]")) {
      return { type: "web", content: msg.replace("[Web] ", ""), image };
    }

    // handle image-only MC messages like `<username>`
    const mcOnlyNameMatch = msg.match(/^`?<(.+?)>`?$/);
    if (mcOnlyNameMatch) {
      return {
        type: "minecraft",
        name: mcOnlyNameMatch[1],
        content: "", // no text content
        image,
      };
    }

    const mcFullMatch = msg.match(/^`?<(.+?)>`?\s+(.*)$/);
    if (mcFullMatch) {
      return {
        type: "minecraft",
        name: mcFullMatch[1],
        content: mcFullMatch[2],
        image,
      };
    }

    const discordMatch = msg.match(/^\[(.+?)\]:\s*(.*)$/);
    if (discordMatch) {
      return {
        type: "discord",
        name: discordMatch[1],
        content: discordMatch[2],
        image,
      };
    }

    return { type: "generic", content: msg, image };
  };

  return (
    <>
      {zoomedImage && (
        <div
          className="image-zoom-overlay"
          onClick={() => setZoomedImage(null)}
          onKeyDown={(e) => e.key === "Escape" && setZoomedImage(null)}
          tabIndex={0}
        >
          <img src={zoomedImage} alt="Zoomed" className="image-zoomed" />
        </div>
      )}
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
                const { type, name, content, image } = getMessageParts(msg);
                return (
                  <div key={index} className={`chat-message message-${type}`}>
                    {type === "minecraft" && (
                      <>
                        <div className="mc-avatar-wrapper">
                          <img
                            src={`https://minotar.net/avatar/${name}/32`}
                            alt={name}
                            className="avatar"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                          <span
                            className={`mc-status-dot ${
                              playerStatuses[name]
                                ? "mc-status-online"
                                : "mc-status-offline"
                            }`}
                            title={playerStatuses[name] ? "Online" : "Offline"}
                          />
                        </div>
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
                    {image && (
                      <div className="chat-image">
                        <img
                          src={image}
                          alt="attachment"
                          className="chat-image-thumb"
                          onClick={() => setZoomedImage(image)}
                        />
                      </div>
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
    </>
  );
};

export default ServerChat;
