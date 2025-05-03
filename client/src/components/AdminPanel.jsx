import React, { useEffect, useState } from "react";

const AdminPanel = () => {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const discordId = localStorage.getItem("discord_id");

    fetch("http://localhost:5000/api/discord/validate", {
      headers: { "discord-id": discordId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setAllowed(true);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      });
  }, []);

  if (!allowed) return null;

  return (
    <div>
      <h1>Secret Admin Panel</h1>
      <p>Welcome, admin.</p>
    </div>
  );
};

export default AdminPanel;
