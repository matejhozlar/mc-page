import React, { useEffect, useState } from "react";
import MarketLoginButton from "./MarketLoginButton";

// components
import TokenModal from "./TokenModal";

function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);

  useEffect(() => {
    fetch("/api/user/validate", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(data.valid))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/user/full-profile", { credentials: "include" })
      .then((res) => res.json())
      .then(setProfile);

    fetch("/api/market/tokens", { credentials: "include" })
      .then((res) => res.json())
      .then(setTokens);
  }, [isLoggedIn]);

  if (loading) return <div className="market-loading">Loading...</div>;

  if (!isLoggedIn) {
    return (
      <div className="market-login-required">
        <p>You must be logged in to access the market.</p>
        <MarketLoginButton />
      </div>
    );
  }

  if (!profile) {
    return <div className="market-loading">Loading profile...</div>;
  }

  return (
    <div className="market-page">
      <header className="market-header">
        <h1 className="market-title">Createrington Market</h1>
        <p className="market-subtitle">
          Trade crypto tokens with your Minecraft currency
        </p>
      </header>

      <section className="market-overview">
        <div className="market-card user-card">
          <div className="user-card-glow" />
          <div className="user-top">
            <img
              className="user-avatar"
              src={`https://crafatar.com/avatars/${profile.uuid}?size=64&overlay`}
              alt={`${profile.name}'s avatar`}
            />
            <div className="user-info">
              <h3>{profile.name}</h3>
              <p>Player since {new Date(profile.first_joined).getFullYear()}</p>
            </div>
          </div>
          <div className="user-stats">
            <div className="stat-box">
              <span className="stat-value">
                {Math.floor(profile.play_time_seconds / 3600)}h
              </span>
              <span className="stat-label">Playtime</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                {Math.floor(
                  (Date.now() - new Date(profile.last_seen)) /
                    (1000 * 60 * 60 * 24)
                )}
                d
              </span>
              <span className="stat-label">Last Seen</span>
            </div>
          </div>
        </div>
        <div className="market-card balance-card">
          <div className="balance-card-glow" />
          <h2>
            $
            {Number(profile.balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p>In-Game Balance</p>
        </div>
      </section>

      <section className="token-section">
        <div className="token-header">
          <h2>Available Tokens</h2>
          <span>
            {tokens.length} token{tokens.length !== 1 ? "s" : ""} available
          </span>
        </div>

        <div className="token-grid">
          {tokens.map((token) => (
            <button
              className="token-card-button"
              key={token.symbol}
              onClick={() => setSelectedToken(token)}
            >
              <div className="token-card-content">
                <div className="token-header">
                  <h3 className="token-name">{token.name}</h3>
                  <div className="token-symbol-pill">{token.symbol}</div>
                </div>
                <p className="token-supply">
                  Supply: {Number(token.total_supply).toLocaleString()}
                </p>
                <p className="token-price">
                  ${Number(token.price_per_unit).toFixed(2)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
      {selectedToken && (
        <TokenModal
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </div>
  );
}

export default Market;
