import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { FaDiscord, FaGlobe } from "react-icons/fa";
import { usePlayers } from "./AdminPlayerProvider";
import { marked } from "marked";
const STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

const SERVER_URL = "http://localhost:5000";
const socket = io(SERVER_URL);

const AdminServerChat = () => {
  const { players: onlinePlayers = [] } = usePlayers();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const hasScrolledInitially = useRef(false);

  const transformWaypointToLink = (text) => {
    return text.replace(
      /xaero-waypoint:([^:]+):[^:]*:(-?\d+|~):(-?\d+|~):(-?\d+|~):[^:]*:[^:]*:[^:]*:(Internal-[\w-]+)/g,
      (_, name, x, y, z, dimensionId) => {
        let world = "world";
        let badge = '<span style="color: green;">[Overworld]</span>';

        if (dimensionId.includes("nether")) {
          world = "world_the_nether";
          badge = '<span style="color: red;">[Nether]</span>';
        } else if (dimensionId.includes("end")) {
          world = "world_the_end";
          badge = '<span style="color: purple;">[The End]</span>';
        }

        const safeX = x === "~" ? "0" : x;
        const safeY = y === "~" ? "64" : y;
        const safeZ = z === "~" ? "0" : z;

        const url = `https://create-rington.com/bluemap/#${world}:${safeX}:${safeY}:${safeZ}:1500:0:0:0:0:perspective`;

        return `${badge} <a href="${url}" target="_blank" rel="noopener noreferrer">${name} (${safeX}, ${safeY}, ${safeZ})</a>`;
      }
    );
  };

  const getAvatarUrl = (uuid, size = 32) =>
    `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;

  const getUuidByName = (name) => {
    const match = onlinePlayers.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    return match?.id || STEVE_UUID;
  };

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setAdminUser(data);
        }
      });
  }, []);

  useEffect(() => {
    const handleChatMessage = (message) => {
      const text = typeof message === "string" ? message : message?.text;
      const image = message?.image || null;

      const hasText = text?.trim().length > 0;
      const hasImage = Boolean(image);
      if (!hasText && !hasImage) return;

      setMessages((prev) => [...prev, message]);
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
    if (autoScrollEnabled && hasScrolledInitially.current) {
      scrollToBottom();
    }
  }, [messages, autoScrollEnabled]);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(prev - 1, 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

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
        formData.append("authorName", adminUser?.name || "admin");

        await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
      } else {
        socket.emit("sendChatMessage", {
          message: input.trim(),
          token: "admin",
          authorName: adminUser?.name || "admin",
        });
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setInput("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getMessageParts = (msgObj) => {
    let rawText = "";
    let image = null;
    let authorType = "web";

    if (typeof msgObj === "string") {
      rawText = msgObj;
    } else if (typeof msgObj === "object" && msgObj !== null) {
      rawText = msgObj.text ?? "";
      image = msgObj.image || null;
      authorType = msgObj.authorType || "web";
    }

    const msg = rawText.replace(/^\[Createrington\]:\s*/, "").trim();

    if (authorType === "web") {
      const webMatch = msg.match(/^<(.+?)>\s*(.*)$/);
      if (webMatch) {
        return {
          type: "web",
          name: "web",
          content: `&lt;${webMatch[1]}&gt; ${webMatch[2]}`,
          image,
        };
      }
    }

    const discordMatch = msg.match(/^\[(.+?)\]:\s*(.*)$/);
    if (discordMatch) {
      const authorName = discordMatch[1];
      const isWebBot = authorName === "WebChatBot" || authorName === "Web";
      return {
        type: isWebBot ? "web" : "discord",
        name: isWebBot ? "web" : authorName,
        content: discordMatch[2],
        image,
      };
    }

    const mcOnlyMatch = msg.match(/^`?<(.+?)>`?$/);
    if (mcOnlyMatch) {
      return {
        type: "minecraft",
        name: mcOnlyMatch[1],
        content: "",
        image,
      };
    }

    const mcFullMatch = msg.match(/^`?<(.+?)>`?\s+(.*)$/);
    if (mcFullMatch) {
      return {
        type: "minecraft",
        name: mcFullMatch[1],
        content: transformWaypointToLink(mcFullMatch[2]),
        image,
      };
    }

    return {
      type: "web",
      name: "web",
      content: marked.parseInline(msg),
      image,
    };
  };

  const isPlayerOnline = (name) =>
    onlinePlayers.some((p) => p.name === name && p.online);

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

      <div className="admin-chat-container">
        <div className="admin-chat-header">
          <h2 className="admin-chat-title">Server Chat</h2>
          <button
            className={`admin-chat-autoscroll ${
              autoScrollEnabled ? "btn-success-fix" : "btn-outline-secondary"
            }`}
            onClick={() => setAutoScrollEnabled((prev) => !prev)}
          >
            Auto-Scroll: {autoScrollEnabled ? "On" : "Off"}
          </button>
        </div>

        <div className="admin-chat-messages" ref={chatMessagesRef}>
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
                  <div
                    key={index}
                    className={`admin-chat-message message-${type}`}
                  >
                    {type === "minecraft" && (
                      <>
                        <div className="mc-avatar-wrapper">
                          <img
                            src={getAvatarUrl(getUuidByName(name))}
                            alt={name}
                            className="avatar"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://minotar.net/avatar/${name}/32.png`;
                              e.target.onerror = () => {
                                e.target.onerror = null;
                                e.target.src = getAvatarUrl(STEVE_UUID);
                              };
                            }}
                          />
                          <span
                            className={`mc-status-dot ${
                              isPlayerOnline(name)
                                ? "mc-status-online"
                                : "mc-status-offline"
                            }`}
                            title={isPlayerOnline(name) ? "Online" : "Offline"}
                          />
                        </div>
                        <strong className="msg-name">{name}</strong> &gt;{" "}
                        <span
                          className="msg-content"
                          dangerouslySetInnerHTML={{ __html: content }}
                        />
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
                        <strong className="msg-name">{name}</strong> &gt;{" "}
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                      </>
                    )}
                    {image && (
                      <div className="admin-chat-image">
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

        <form onSubmit={sendMessage} className="admin-chat-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="admin-chat-input"
          />
          <label className="admin-chat-upload">
            Upload Image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              style={{ display: "none" }}
            />
          </label>
          <button type="submit" className="admin-chat-send">
            Send
          </button>
        </form>

        {cooldownRemaining > 0 && (
          <div className="admin-chat-status">
            Please wait {cooldownRemaining}s before sending another message.
          </div>
        )}
      </div>
    </>
  );
};

export default AdminServerChat;
