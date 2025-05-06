import React, { useState, useEffect, useRef } from "react";
import { usePlayers } from "./AdminPlayerProvider";

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
      flexDirection: "column",
      marginBottom: "1rem",
      width: "100%",
    }}
  >
    <label style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
      {label}
    </label>
    <div className="input-action-row">
      <div className="input-wrap">{input}</div>
      <div className="button-wrap">{action}</div>
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

const AdminRconPanel = () => {
  const { players = [] } = usePlayers();
  const [mcName, setMcName] = useState("");
  const [targetPlayer, setTargetPlayer] = useState("");
  const [sayMessage, setSayMessage] = useState("");
  const [gamemode, setGamemode] = useState("creative");
  const [isVanished, setIsVanished] = useState(null);
  const [time, setTime] = useState("day");
  const [weather, setWeather] = useState("clear");
  const [mutePlayer, setMutePlayer] = useState("");
  const [unmutePlayer, setUnmutePlayer] = useState("");
  const [banPlayer, setBanPlayer] = useState("");
  const [unbanPlayer, setUnbanPlayer] = useState("");
  const [output, setOutput] = useState("");

  const toggleVanish = async () => {
    setOutput("⏳ Checking vanish status...");

    try {
      const checkRes = await fetch("/api/admin/rcon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `/v get ${mcName}` }),
      });

      const checkData = await checkRes.json();
      const checkText = (
        checkData.response ||
        checkData.error ||
        ""
      ).toLowerCase();
      console.log("[VANISH] /v get response:", checkText);

      if (/no player (was )?found/i.test(checkText)) {
        setOutput(
          "⚠️ You must be online in Minecraft to use the vanish toggle."
        );
        return;
      }

      setOutput("⏳ Sending vanish toggle...");
      const toggleRes = await fetch("/api/admin/rcon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `/v toggle ${mcName}` }),
      });

      const toggleData = await toggleRes.json();
      const toggleResponse = (
        toggleData.response ||
        toggleData.error ||
        ""
      ).toLowerCase();
      console.log("[VANISH] /v toggle response:", toggleResponse);

      const verifyRes = await fetch("/api/admin/rcon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `/v get ${mcName}` }),
      });

      const verifyData = await verifyRes.json();
      const verifyText = (verifyData.response || "").toLowerCase();
      console.log("[VANISH] /v get verify response:", verifyText);

      if (/no player (was )?found/i.test(verifyText)) {
        setOutput("⚠️ Could not verify vanish state. You might be offline.");
        return;
      }

      const newStatus = verifyText.includes("currently vanished");
      setIsVanished(newStatus);
      setOutput(`✅ Vanish ${newStatus ? "enabled" : "disabled"}.`);

      await fetch("/api/admin/vanish-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: mcName, vanished: newStatus }),
      });
    } catch (err) {
      console.error("Toggle vanish failed:", err);
      setOutput("❌ Unexpected error occurred.");
    }
  };

  useEffect(() => {
    if (!mcName) return;

    const fetchVanishStatusFromDB = async () => {
      try {
        const res = await fetch(`/api/admin/vanish-status?name=${mcName}`, {
          credentials: "include",
        });
        const data = await res.json();
        setIsVanished(data.vanished);
      } catch (err) {
        console.error("Error fetching vanish status from DB", err);
      }
    };

    fetchVanishStatusFromDB();
  }, [mcName]);

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMcName(data.name));
  }, []);

  const sendCommand = async (command) => {
    setOutput("Running...");
    const res = await fetch("/api/admin/rcon", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setOutput(data.response || data.error || "No response");
  };

  const onlinePlayers = players.filter((p) => p.online);

  const playerList = onlinePlayers.map((p) => p.name);

  return (
    <div className="admin-commands-container" style={{ marginTop: "2rem" }}>
      <h3 className="admin-chat-title">Admin Commands</h3>

      <Card title="Player Controls">
        <InputGroup
          label="Vanish"
          input={
            <div style={{ display: "flex", alignItems: "center" }}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!!isVanished}
                  onChange={(e) => {
                    e.preventDefault();
                    toggleVanish();
                  }}
                />

                <span className="slider round"></span>
              </label>
              <span style={{ marginLeft: "0.75rem" }}>
                {isVanished ? "ON" : "OFF"}
              </span>
            </div>
          }
          action={<></>}
        />

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
              className="admin-command-button"
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
              className="admin-select"
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
              className="admin-command-button"
              onClick={() => sendCommand(`/gamemode ${gamemode} ${mcName}`)}
            >
              Set Gamemode
            </button>
          }
        />
      </Card>

      <Card title="Moderation">
        <InputGroup
          label="Ban Player"
          input={
            <AutocompleteInput
              value={banPlayer}
              onChange={setBanPlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              className="admin-command-button"
              onClick={() => {
                sendCommand(`/ban ${banPlayer}`);
                setBanPlayer("");
              }}
            >
              Ban
            </button>
          }
        />

        <InputGroup
          label="Unban Player"
          input={
            <AutocompleteInput
              value={unbanPlayer}
              onChange={setUnbanPlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              className="admin-command-button"
              onClick={() => {
                sendCommand(`/pardon ${unbanPlayer}`);
                setUnbanPlayer("");
              }}
            >
              Unban
            </button>
          }
        />

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
              className="admin-command-button"
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
              className="admin-command-button"
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
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={sayMessage}
                onChange={(e) => setSayMessage(e.target.value)}
                placeholder="Your message"
                className="admin-input"
              />
            </div>
          }
          action={
            <button
              className="admin-command-button"
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
              className="admin-select"
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
              className="admin-command-button"
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
              className="admin-select"
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
              className="admin-command-button"
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
