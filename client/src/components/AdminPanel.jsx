import React, { useEffect, useState } from "react";

// components
import AdminChat from "./AdminChat.jsx";
import AdminRconPanel from "./AdminRconPanel.jsx";
import AdminUsersTable from "./AdminUsersTable.jsx";
import AdminWaitlistTable from "./AdminWaitlistTable.jsx";

// utils
import { AdminConsoleContext } from "./utils/AdminConsoleContext";

const AdminPanel = () => {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [logs, setLogs] = useState([]);
  const appendLog = (msg) => setLogs((prev) => [...prev.slice(-49), msg]);

  const getAvatarUrl = (uuid, size = 80) =>
    `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;

  useEffect(() => {
    fetch("/api/admin/validate", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setAllowed(true);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => {
        setChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!allowed) return;

    fetch("/api/admin/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setUser(data);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        localStorage.clear();
        window.location.href = "/";
      });
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;

    const fetchOnlinePlayers = () => {
      fetch("/api/players")
        .then((res) => res.json())
        .then((data) => {
          const players = data.players || [];
          const onlineOnly = players.filter((p) => p.online === true);
          setOnlinePlayers(onlineOnly);
        })
        .catch((err) => {
          console.error("Failed to fetch online players:", err);
        });
    };

    fetchOnlinePlayers();
    const interval = setInterval(fetchOnlinePlayers, 5000);

    return () => clearInterval(interval);
  }, [allowed]);

  const handleLogout = () => {
    fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    }).then(() => {
      localStorage.clear();
      window.location.href = "/";
    });
  };

  if (!checked || (allowed && !user))
    return (
      <div className="admin-panel-wrapper">
        <p>Loading...</p>
      </div>
    );
  if (!allowed) return null;

  return (
    <div className="admin-panel-container">
      <div className="admin-top-section">
        <div className="admin-player-card">
          <img
            src={getAvatarUrl(user.uuid, 80)}
            alt={user.name}
            className="admin-skin"
          />
          <h2>{user.name}</h2>
          <p>UUID: {user.uuid}</p>
          <p>Discord ID: {user.discord_id}</p>
          <p>
            Playtime: {Math.floor(user.play_time_seconds / 3600)}h{" "}
            {Math.floor((user.play_time_seconds % 3600) / 60)}m
          </p>
          <p>Last seen: {new Date(user.last_seen).toLocaleString()}</p>
        </div>

        <div className="admin-chat-wrapper">
          <AdminChat />
        </div>
      </div>
      {onlinePlayers.length > 0 && (
        <div className="admin-online-players">
          <h3>🟢 {onlinePlayers.length} Player(s) Online</h3>
          <ul className="admin-player-list">
            {onlinePlayers.map((player) => (
              <li key={player.id} className="admin-player-item">
                <img
                  src={getAvatarUrl(player.id, 32)}
                  alt={player.name}
                  className="avatar admin-onlineplayers-avatar-fix"
                />
                <span>{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* More admin tools will go below this */}
      <AdminConsoleContext.Provider value={{ appendLog }}>
        <div className="admin-rcon-wrapper">
          <AdminRconPanel logs={logs} />
        </div>
        <AdminWaitlistTable />
      </AdminConsoleContext.Provider>

      <AdminUsersTable />
      <button className="admin-logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default AdminPanel;
