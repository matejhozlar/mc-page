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
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    const handleChatMessage = (message) => {
      const text = typeof message === "string" ? message : message?.text;
      const image = message?.image || null;

      const hasText = text?.trim().length > 0;
      const hasImage = Boolean(image);

      if (!hasText && !hasImage) return;

      setMessages((prev) => [...prev, { text, image }]);
    };

    const handleChatHistory = (history) => {
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

  const sendMessage = async (e) => {
    e.preventDefault();
    const now = Date.now();
    const secondsSinceLast = (now - lastSent) / 1000;

    if (secondsSinceLast < 10) {
      setCooldownRemaining(Math.ceil(10 - secondsSinceLast));
      return;
    }

    if (!input.trim() && !imageFile) return;

    setLastSent(now);
    setCooldownRemaining(0);

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("message", input.trim());

        await fetch(`${SERVER_URL}/upload-image`, {
          method: "POST",
          body: formData,
        });
      } else {
        socket.emit("sendChatMessage", input.trim());
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setInput("");
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      rawText = msgObj.text ?? "";
      image = msgObj.image || null;
    }

    const msg = rawText.replace(/^\[Createrington\]:\s*/, "").trim();

    // ✅ If image exists and text is empty — still show it
    if (!msg && image) {
      return {
        type: "web",
        name: "web",
        content: "",
        image,
      };
    }

    // Discord-style: [Username]: Hello
    const discordMatch = msg.match(/^\[(.+?)\]:\s*(.*)$/);
    if (discordMatch) {
      const authorName = discordMatch[1];
      const isWebBot = authorName === "WebChatBot";
      return {
        type: isWebBot ? "web" : "discord",
        name: isWebBot ? "web" : authorName,
        content: discordMatch[2],
        image,
      };
    }

    // Minecraft: <Steve>
    const mcOnlyNameMatch = msg.match(/^`?<(.+?)>`?$/);
    if (mcOnlyNameMatch) {
      return {
        type: "minecraft",
        name: mcOnlyNameMatch[1],
        content: "",
        image,
      };
    }

    // Minecraft full: <Steve> hello
    const mcFullMatch = msg.match(/^`?<(.+?)>`?\s+(.*)$/);
    if (mcFullMatch) {
      return {
        type: "minecraft",
        name: mcFullMatch[1],
        content: mcFullMatch[2],
        image,
      };
    }

    // Fallback: treat as a plain web message
    return {
      type: "web",
      name: "web",
      content: msg,
      image,
    };
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
                const parts = getMessageParts(msg);
                if (!parts) return null;

                const { type, name, content, image } = parts;
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

        {imageFile && (
          <div className="mt-2">
            <strong>Image:</strong> {imageFile.name}
            <button
              onClick={() => setImageFile(null)}
              type="button"
              className="btn btn-sm btn-link text-danger"
            >
              Remove
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="chat-form d-flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="chat-input form-control me-2"
          />
          <div className="custom-file-input-wrapper me-2">
            <label className="btn btn-secondary mb-0">
              Upload Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
          </div>
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
