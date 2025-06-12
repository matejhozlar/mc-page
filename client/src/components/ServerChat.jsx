import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { FaDiscord, FaGlobe } from "react-icons/fa";
import { marked } from "marked";
const STEVE_UUID = "8667ba71b85a4004af54457a9734eed7";

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

  // token verification
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [tokenInput, setTokenInput] = useState("");

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

  const getPlayerUUID = (name) => {
    const key = Object.keys(playerStatuses).find(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    return key && playerStatuses[key]?.uuid
      ? playerStatuses[key].uuid
      : STEVE_UUID;
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("chat_token");
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch("/api/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (data.success) {
        setVerifiedUser(data.user);
        localStorage.setItem("chat_token", token);
        localStorage.setItem("chat_user_name", data.user.name);
      } else {
        localStorage.removeItem("chat_token");
      }
    } catch (err) {
      console.error("Token verification failed", err);
    }
  };

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
    const handler = (e) => {
      if (e.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const fetchPlayerStatuses = async () => {
      try {
        const res = await fetch("/api/players");
        const data = await res.json();
        const statuses = {};
        data.players.forEach((player) => {
          statuses[player.name] = {
            online: player.online,
            uuid: player.id,
          };
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
        formData.append("authorName", localStorage.getItem("chat_user_name"));

        await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
      } else {
        socket.emit("sendChatMessage", {
          message: input.trim(),
          token: localStorage.getItem("chat_token"),
          authorName: localStorage.getItem("chat_user_name"),
        });
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setInput("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    let authorType = "web";

    if (typeof msgObj === "string") {
      rawText = msgObj;
    } else if (typeof msgObj === "object" && msgObj !== null) {
      rawText = msgObj.text ?? "";
      image = msgObj.image || null;
      authorType = msgObj.authorType || "web";
    }

    const msg = rawText.replace(/^\[Createrington\]:\s*/, "").trim();

    // Web message with known format
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

    // Discord-style: [Username]: Hello
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

    // Minecraft-style
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

    // Fallback to web type
    return {
      type: "web",
      name: "web",
      content: marked.parseInline(msg),
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
                            src={`https://crafatar.com/avatars/${getPlayerUUID(
                              name
                            )}?size=32&overlay`}
                            alt={name}
                            className="avatar"
                          />
                          <span
                            className={`mc-status-dot ${
                              playerStatuses[name]?.online
                                ? "mc-status-online"
                                : "mc-status-offline"
                            }`}
                            title={
                              playerStatuses[name]?.online
                                ? "Online"
                                : "Offline"
                            }
                          />
                        </div>
                        <strong className="msg-name">{name}</strong> &gt;{" "}
                        <span dangerouslySetInnerHTML={{ __html: content }} />
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

        {!verifiedUser ? (
          <div className="card p-3 bg-dark border border-warning mt-3">
            <h5 className="text-warning">🔒 Chat Locked</h5>
            <p className="text-light mb-2">
              Paste your Discord token to unlock chat:
            </p>
            <div className="d-flex">
              <input
                type="text"
                className="form-control me-2"
                placeholder="Enter your token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button
                className="btn btn-warning"
                onClick={() => verifyToken(tokenInput.trim())}
              >
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="chat-form d-flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="chat-input form-control me-2"
            />
            <div className="custom-file-input-wrapper d-none d-md-block me-2">
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
        )}

        <div className="d-block d-md-none mt-2">
          <label className="btn btn-secondary w-100">
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
