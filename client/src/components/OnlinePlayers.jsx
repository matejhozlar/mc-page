import React, { useState, useEffect } from "react";

const getAvatarUrl = (uuid, size = 64) =>
  `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;

const OnlinePlayers = () => {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players", { cache: "no-cache" });
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

  return (
    <div className="online-players">
      <h2>Online Players</h2>
      {error && <div className="error">Error: {error}</div>}
      {players.length === 0 && <div>No players online.</div>}
      <ul className="players-list">
        {players.map((player) => (
          <li key={player.id} className="player-item">
            {/* If the UUID is provided, render an image using Crafatar */}
            {player.id && (
              <img
                src={getAvatarUrl(player.id)}
                alt={`${player.name}'s skin`}
                className="player-avatar"
              />
            )}
            <span className="player-name">{player.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OnlinePlayers;
