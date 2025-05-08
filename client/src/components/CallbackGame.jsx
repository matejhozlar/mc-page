import React, { useEffect } from "react";

const CallbackGame = () => {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    fetch("/api/discord/callback-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not authorized");
        return res.json();
      })
      .then((data) => {
        window.history.replaceState({}, document.title, "/game");
        window.location.href = "/game";
      })
      .catch(() => {
        alert("Login failed or unauthorized.");
        window.location.href = "/";
      });
  }, []);

  return <p>Logging in via Discord...</p>;
};

export default CallbackGame;
