import React, { useState, useEffect, useRef } from "react";
import { usePlayers } from "./AdminPlayerProvider";

const CustomDropdown = ({ value, onChange, options }) => {
  const [showOptions, setShowOptions] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setShowOptions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ flex: 1, position: "relative" }}>
      <div
        onClick={() => setShowOptions(!showOptions)}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          border: "none",
          fontSize: "1rem",
          height: "42px",
          backgroundColor: "#fff",
          color: "#1a1a1a",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {value.charAt(0).toUpperCase() + value.slice(1)}
        <span style={{ marginLeft: "0.5rem" }}>▾</span>
      </div>

      {showOptions && (
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
            zIndex: 10000,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                onChange(opt);
                setShowOptions(false);
              }}
              style={{
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
                borderBottom: "1px solid #444",
                color: "#fff",
                backgroundColor:
                  opt === value ? "var(--primary-color)" : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const renderLog = (logEntry) => {
  const text = typeof logEntry === "string" ? logEntry : logEntry?.text || "";

  const isError = text.includes("⚠️") || text.includes("❌");
  const isSuccess = text.includes("✅");
  const isRunning = text.includes("⏳") || text.includes("Running...");

  const borderColor = isError
    ? "#e74c3c"
    : isSuccess
    ? "#2ecc71"
    : isRunning
    ? "#f1c40f"
    : "#888";

  const bgColor = isError
    ? "#3a1f1f"
    : isSuccess
    ? "#1f3a2a"
    : isRunning
    ? "#3a3a1f"
    : "#2b2b2b";

  const textColor = isError
    ? "#f5bcbc"
    : isSuccess
    ? "#bfffcf"
    : isRunning
    ? "#fff3bf"
    : "#ddd";

  return (
    <div
      style={{
        marginBottom: "0.5rem",
        fontFamily: "monospace",
        fontSize: "0.875rem",
        padding: "0.5rem 0.75rem",
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bgColor,
        borderRadius: "6px",
        color: textColor,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
};

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

const AdminRconPanel = ({ logs }) => {
  const { players = [] } = usePlayers();
  const [mcName, setMcName] = useState("");
  const [targetPlayer, setTargetPlayer] = useState("");
  const [tpHerePlayer, setTpHerePlayer] = useState("");
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
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const prevLogsRef = useRef([]);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    const prevLength = prevLogsRef.current.length;
    const newLength = logs?.length || 0;

    if (newLength > prevLength) {
      setConsoleOpen(true);
    }

    prevLogsRef.current = logs || [];
  }, [logs]);

  const appendLog = (message) => {
    setConsoleOpen(true);
    setConsoleLogs((logs) => [
      ...logs.slice(-49),
      { text: message, time: Date.now() },
    ]);
  };

  useEffect(() => {
    if (consoleOpen && consoleEndRef.current) {
      setTimeout(() => {
        consoleEndRef.current.scrollIntoView({ behavior: "auto" });
      }, 0);
    }
  }, [logs, consoleOpen]);

  useEffect(() => {
    if (consoleOpen && consoleEndRef.current) {
      setTimeout(() => {
        consoleEndRef.current.scrollIntoView({ behavior: "auto" });
      }, 0);
    }
  }, [consoleLogs, consoleOpen]);

  const toggleVanish = async () => {
    appendLog("⏳ Checking vanish status...");
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

      if (/no player (was )?found/i.test(checkText)) {
        appendLog(
          "⚠️ You must be online in Minecraft to use the vanish toggle."
        );
        setOutput(
          "⚠️ You must be online in Minecraft to use the vanish toggle."
        );
        return;
      }

      appendLog("⏳ Sending vanish toggle...");
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

      if (/no player (was )?found/i.test(verifyText)) {
        appendLog("⚠️ Could not verify vanish state. You might be offline.");
        setOutput("⚠️ Could not verify vanish state. You might be offline.");
        return;
      }

      const newStatus = verifyText.includes("currently vanished");
      setIsVanished(newStatus);
      appendLog(`✅ Vanish ${newStatus ? "enabled" : "disabled"}.`);
      setOutput(`✅ Vanish ${newStatus ? "enabled" : "disabled"}.`);

      await fetch("/api/admin/vanish-status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: mcName, vanished: newStatus }),
      });
    } catch (err) {
      console.error("Toggle vanish failed:", err);
      appendLog("❌ Unexpected error occurred.");
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
    appendLog("Running...");
    setOutput("Running...");
    const res = await fetch("/api/admin/rcon", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    appendLog(data.response || data.error || "No response");
    setOutput(data.response || data.error || "No response");
  };

  const onlinePlayers = players.filter((p) => p.online);

  const playerList = onlinePlayers.map((p) => p.name);

  const mergedLogs = [...consoleLogs, ...(logs || [])]
    .sort((a, b) => a.time - b.time)
    .slice(-50);

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
          label="Teleport Here"
          input={
            <AutocompleteInput
              value={tpHerePlayer}
              onChange={setTpHerePlayer}
              placeholder="Player name"
              suggestions={playerList}
            />
          }
          action={
            <button
              className="admin-command-button"
              onClick={() => {
                sendCommand(`/tp ${tpHerePlayer} ${mcName}`);
                setTargetPlayer("");
              }}
            >
              Teleport Here
            </button>
          }
        />

        <InputGroup
          label="Gamemode"
          input={
            <CustomDropdown
              value={gamemode}
              onChange={setGamemode}
              options={["creative", "survival", "spectator"]}
            />
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
            <CustomDropdown
              value={time}
              onChange={setTime}
              options={["day", "night"]}
            />
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
            <CustomDropdown
              value={weather}
              onChange={setWeather}
              options={["clear", "rain", "thunder"]}
            />
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

      <div
        className="admin-console"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: consoleOpen ? "420px" : "260px",
          height: consoleOpen ? "420px" : "36px",

          marginBottom: 0,
          paddingBottom: 0,
          boxSizing: "border-box",

          background: "#1a1a1a",
          color: "#fff",
          fontSize: "0.875rem",
          zIndex: 10000,
          borderTopLeftRadius: "8px",
          border: "1px solid #333",
          boxShadow: consoleOpen ? "0 0 10px rgba(0,0,0,0.5)" : "none",
          overflow: "hidden",
          transition: "all 0.3s ease-in-out",
        }}
      >
        <div
          onClick={() => setConsoleOpen(!consoleOpen)}
          style={{
            padding: "0.25rem 0.5rem",
            cursor: "pointer",
            background: "#333",
            fontWeight: "bold",
            borderBottom: "1px solid #444",
          }}
        >
          {consoleOpen ? "▾ Admin Console" : "Console ▸"}
        </div>
        {consoleOpen && (
          <div
            style={{
              padding: "0.5rem",
              overflowY: "auto",
              height: "calc(100% - 32px)",
              scrollbarWidth: "thin",
            }}
          >
            {mergedLogs.map((log, idx) => (
              <React.Fragment key={idx}>{renderLog(log.text)}</React.Fragment>
            ))}
            <div ref={consoleEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRconPanel;
