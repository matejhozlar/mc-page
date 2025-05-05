import React, { useState, useEffect } from "react";

const getAvatarUrl = (uuid, size = 64) =>
  `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;

const OnlinePlayers = () => {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players", {
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      const data = await response.json();
      setPlayers(data.players);
    } catch (err) {
      console.error("Error fetching players:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const intervalId = setInterval(fetchPlayers, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const online = players.filter((p) => p.online);
  const offline = players.filter((p) => !p.online);

  return (
    <div className="online-players">
      <h2 className="section-title online-title">
        <span className="status-dot online"></span> Online Players
      </h2>
      {error && <div className="error">Error: {error}</div>}
      {online.length === 0 && <div>No players online.</div>}
      <ul className="players-list">
        {online.map((player) => (
          <li key={player.id} className="player-item">
            <img
              src={getAvatarUrl(player.id)}
              alt={`${player.name}'s skin`}
              className="player-avatar"
            />
            <span className="player-name">{player.name}</span>
          </li>
        ))}
      </ul>

      {offline.length > 0 && (
        <>
          <h2 className="section-title offline-title">
            <span className="status-dot offline"></span> Offline Players
          </h2>
          <ul className="players-list">
            {offline.map((player) => (
              <li key={player.id} className="player-item">
                {player.id && (
                  <img
                    src={getAvatarUrl(player.id)}
                    alt={`${player.name}'s skin`}
                    className="player-avatar"
                  />
                )}
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  <span className="player-lastseen">
                    🕒 Last seen: {formatTimeAgo(player.last_seen)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default OnlinePlayers;
