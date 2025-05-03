import React, { useState, useEffect, useRef } from "react";

const Card = ({ title, children }) => (
  <div
    style={{
      background: "var(--muted-color)",
      padding: "1rem",
      borderRadius: "10px",
      marginBottom: "1rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    }}
  >
    <h4 style={{ marginBottom: "0.75rem", color: "var(--primary-color)" }}>
      {title}
    </h4>
    {children}
  </div>
);

const InputGroup = ({ label, input, action }) => (
  <div
    style={{
      display: "flex",
      gap: "0.5rem",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: "0.75rem",
    }}
  >
    <label style={{ minWidth: "120px", fontWeight: "bold" }}>{label}</label>
    <div
      style={{ flex: 1, display: "flex", gap: "0.5rem", position: "relative" }}
    >
      {input}
      {action}
    </div>
  </div>
);

const AutocompleteInput = ({ value, onChange, placeholder, suggestions }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ flex: 1, position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          border: "none",
          fontSize: "1rem",
          height: "42px",
        }}
      />
      {showSuggestions && (
        <ul
          style={{
            position: "absolute",
            top: "44px",
            left: 0,
            right: 0,
            background: "#2f2f2f",
            border: "1px solid #444",
            borderRadius: "6px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 10,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {suggestions
            .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
            .map((player) => (
              <li
                key={player}
                onClick={() => {
                  onChange(player);
                  setShowSuggestions(false);
                }}
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #444",
                  color: "#fff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--primary-color)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#fff";
                }}
              >
                {player}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

const AdminRconPanel = ({ onlinePlayers = [] }) => {
  const [mcName, setMcName] = useState("");
  const [targetPlayer, setTargetPlayer] = useState("");
  const [sayMessage, setSayMessage] = useState("");
  const [gamemode, setGamemode] = useState("creative");
  const [time, setTime] = useState("day");
  const [weather, setWeather] = useState("clear");
  const [mutePlayer, setMutePlayer] = useState("");
  const [unmutePlayer, setUnmutePlayer] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMcName(data.name));
  }, []);

  const sendCommand = async (command) => {
    setOutput("Running...");
    const res = await fetch("http://localhost:5000/api/admin/rcon", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setOutput(data.response || data.error || "No response");
  };

  const buttonStyle = {
    height: "42px",
    width: "140px",
    fontWeight: "bold",
    borderRadius: "6px",
    backgroundColor: "var(--primary-color)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
  };

  const playerList = onlinePlayers.map((p) => p.name);

  return (
    <div className="admin-chat-container" style={{ marginTop: "2rem" }}>
      <h3 className="admin-chat-title">Admin Commands</h3>

      <Card title="Player Controls">
        <InputGroup
          label="Teleport"
          input={
            <AutocompleteInput
              value={targetPlayer}
              onChange={setTargetPlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => {
                sendCommand(`/tp ${mcName} ${targetPlayer}`);
                setTargetPlayer("");
              }}
            >
              Teleport
            </button>
          }
        />

        <InputGroup
          label="Gamemode"
          input={
            <select
              value={gamemode}
              onChange={(e) => setGamemode(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "1rem",
                height: "42px",
              }}
            >
              <option value="creative">Creative</option>
              <option value="survival">Survival</option>
              <option value="spectator">Spectator</option>
            </select>
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => sendCommand(`/gamemode ${gamemode} ${mcName}`)}
            >
              Set Gamemode
            </button>
          }
        />
      </Card>

      <Card title="Moderation">
        <InputGroup
          label="Mute Player"
          input={
            <AutocompleteInput
              value={mutePlayer}
              onChange={setMutePlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => {
                sendCommand(`/mute ${mutePlayer}`);
                setMutePlayer("");
              }}
            >
              Mute
            </button>
          }
        />

        <InputGroup
          label="Unmute Player"
          input={
            <AutocompleteInput
              value={unmutePlayer}
              onChange={setUnmutePlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => {
                sendCommand(`/unmute ${unmutePlayer}`);
                setUnmutePlayer("");
              }}
            >
              Unmute
            </button>
          }
        />
      </Card>

      <Card title="Broadcast & Environment">
        <InputGroup
          label="Say Message"
          input={
            <input
              type="text"
              value={sayMessage}
              onChange={(e) => setSayMessage(e.target.value)}
              placeholder="Your message"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "1rem",
                height: "42px",
              }}
            />
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => sendCommand(`/say ${sayMessage}`)}
            >
              Broadcast
            </button>
          }
        />

        <InputGroup
          label="Set Time"
          input={
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "1rem",
                height: "42px",
              }}
            >
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => sendCommand(`/time set ${time}`)}
            >
              Set Time
            </button>
          }
        />

        <InputGroup
          label="Set Weather"
          input={
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "1rem",
                height: "42px",
              }}
            >
              <option value="clear">Clear</option>
              <option value="rain">Rain</option>
              <option value="thunder">Thunder</option>
            </select>
          }
          action={
            <button
              style={buttonStyle}
              onClick={() => sendCommand(`/weather ${weather}`)}
            >
              Set Weather
            </button>
          }
        />
      </Card>

      <pre className="admin-chat-status" style={{ marginTop: "1rem" }}>
        {output}
      </pre>
    </div>
  );
};

export default AdminRconPanel;
