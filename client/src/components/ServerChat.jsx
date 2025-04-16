import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const SERVER_URL = "http://localhost:5000";
const socket = io(SERVER_URL);

const ServerChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.on("chatMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off("chatMessage");
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit("sendChatMessage", input.trim());
      setInput("");
    }
  };

  return (
    <div className="server-chat container mt-3">
      {/* Bootstrap Alert */}
      <div className="alert alert-warning" role="alert">
        Chat is not fully implemented yet. Only sending messages to the server
        work.
      </div>

      <h2>Server Chat</h2>

      {/* Chat Messages Container */}
      <div className="chat-messages mb-3">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet.</div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="chat-message">
              {msg}
            </div>
          ))
        )}
      </div>

      {/* Chat Input Form */}
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
    </div>
  );
};

export default ServerChat;
