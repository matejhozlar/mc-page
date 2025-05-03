import React from "react";

const AdminLoginButton = () => {
  const handleLogin = () => {
    const clientId = "1367925825420267565";
    const redirectUri = encodeURIComponent("http://localhost:3000/callback");
    const scope = "identify";
    const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&prompt=consent`;
    window.location.href = discordUrl;
  };

  return <button onClick={handleLogin}>Login with Discord</button>;
};

export default AdminLoginButton;
