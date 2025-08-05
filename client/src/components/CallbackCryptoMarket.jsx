import React, { useEffect } from "react";

import LoadingSpinner from "./LoadingSpinner.jsx";

const CallbackCryptoMarket = () => {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    fetch("/api/discord/callback-market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not authorized");
        return res.json();
      })
      .then(() => {
        window.history.replaceState({}, document.title, "/market");
        window.location.href = "/market";
      })
      .catch(() => {
        alert("Login failed or unauthorized.");
        window.location.href = "/";
      });
  }, []);

  return <LoadingSpinner message="Logging in via Discord..." />;
};

export default CallbackCryptoMarket;
