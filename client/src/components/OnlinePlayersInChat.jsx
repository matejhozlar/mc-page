import "./css/OnlinePlayersInChat.css";

const OnlinePlayersInChat = ({ players }) => {
  const onlinePlayers = (players || []).filter((p) => p.online === true);

  return (
    <div className="online-players-in-chat">
      <h5 className="text-light mb-3">Online Players</h5>

      {players === null ? (
        <div>Loading...</div>
      ) : onlinePlayers.length > 0 ? (
        <ul className="list-unstyled">
          {onlinePlayers.map((p) => (
            <li key={p.id} className="d-flex align-items-center gap-2 mb-2">
              <img
                src={`https://mc-heads.net/avatar/${p.id}/64`}
                alt={p.name}
                width={32}
                height={32}
                className="rounded"
              />
              <span className="text-light fw-semibold">{p.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div>None is online</div>
      )}
    </div>
  );
};

export default OnlinePlayersInChat;
