import React, { useEffect, useState } from "react";

// components
import AdminChat from "./AdminChat.jsx";

const AdminPanel = () => {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  // Step 1: Validate session
  useEffect(() => {
    fetch("http://localhost:5000/api/admin/validate", {
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

  // Step 2: Fetch user data only if validated
  useEffect(() => {
    if (!allowed) return;

    fetch("http://localhost:5000/api/admin/me", {
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

    fetch("http://localhost:5000/players")
      .then((res) => res.json())
      .then((data) => {
        const players = data.players || [];
        const onlineOnly = players.filter((p) => p.online === true);
        setOnlinePlayers(onlineOnly);
      })
      .catch((err) => {
        console.error("Failed to fetch online players:", err);
      });
  }, [allowed]);

  const handleLogout = () => {
    fetch("http://localhost:5000/api/admin/logout", {
      method: "POST",
      credentials: "include",
    }).then(() => {
      localStorage.clear();
      window.location.href = "/";
    });
  };

  // Wait until all checks are done
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
            src={`https://minotar.net/avatar/${user.name}/80`}
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
          <AdminChat /> {/* Your new admin-only chat component */}
        </div>
      </div>
      {onlinePlayers.length > 0 && (
        <div className="admin-online-players">
          <h3>🟢 {onlinePlayers.length} Player(s) Online</h3>
          <ul className="admin-player-list">
            {onlinePlayers.map((player) => (
              <li key={player.id} className="admin-player-item">
                <img
                  src={`https://minotar.net/avatar/${player.name}/32`}
                  alt={player.name}
                  className="admin-player-avatar"
                />
                <span>{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="admin-logout-btn" onClick={handleLogout}>
        Logout
      </button>
      {/* More admin tools will go below this */}
    </div>
  );
};

export default AdminPanel;
