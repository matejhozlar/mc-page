import React, { useEffect } from "react";

const Callback = () => {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    fetch("http://localhost:5000/api/discord/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        localStorage.setItem("discord_id", data.discord_id);
        localStorage.setItem("is_admin", data.is_admin ? "true" : "false");
        window.history.replaceState({}, document.title, "/admin");
        window.location.href = "/admin";
      })
      .catch(() => {
        alert("Login failed or unauthorized.");
        window.location.href = "/";
      });
  }, []);

  return <p>Logging in via Discord...</p>;
};

export default Callback;
