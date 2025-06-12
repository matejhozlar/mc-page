import React, { useEffect, useState } from "react";
import MarketLoginButton from "./MarketLoginButton.jsx";

// components
import AnimatedNumber from "./AnimatedNumber.jsx";
import TokenModal from "./TokenModal.jsx";
import MarketHeader from "./MarketHeader.jsx";
import ProfileSkinViewer from "./ProfileSkinViewer.jsx";
import PortfolioHistoryChart from "./PortfolioHistoryChart.jsx";
import Games from "./Games.jsx";

function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeTab, setActiveTab] = useState("market");
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [portfolioRange, setPortfolioRange] = useState("7d");
  const [animatedBalance, setAnimatedBalance] = useState(0);

  const fetchFreshData = async () => {
    try {
      const [profileRes, tokensRes, userTokensRes] = await Promise.all([
        fetch("/api/user/full-profile", { credentials: "include" }),
        fetch("/api/market/tokens", { credentials: "include" }),
        fetch("/api/market/user-tokens", { credentials: "include" }),
      ]);

      const profileData = await profileRes.json();
      const tokensData = await tokensRes.json();
      const userTokens = await userTokensRes.json();

      setProfile({ ...profileData, tokens: userTokens });
      setTokens(tokensData);
    } catch (err) {
      console.error("❌ Failed to refresh data:", err);
    }
  };

  const fetchTransactionHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      const res = await fetch("/api/market/transaction-history", {
        credentials: "include",
      });
      const data = await res.json();
      setTransactionHistory(data);
    } catch (err) {
      console.error("❌ Failed to fetch transaction history:", err);
    } finally {
      setTimeout(() => setIsRefreshingHistory(false), 500);
    }
  };

  useEffect(() => {
    fetch("/api/user/validate", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(data.valid))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.balance) {
      setAnimatedBalance(Number(profile.balance));
    }
  }, [profile?.balance]);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/user/full-profile", { credentials: "include" })
      .then((res) => res.json())
      .then(setProfile);

    fetch("/api/market/tokens", { credentials: "include" })
      .then((res) => res.json())
      .then(setTokens);

    fetch("/api/market/user-tokens", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setProfile((prev) => ({ ...prev, tokens: data })));

    fetchTransactionHistory();
  }, [isLoggedIn]);

  useEffect(() => {
    const interval = setInterval(fetchTransactionHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolioHistory = async (range = "7d") => {
    try {
      const res = await fetch(`/api/market/portfolio-history?range=${range}`, {
        credentials: "include",
      });
      const data = await res.json();
      setPortfolioHistory(data);
    } catch (err) {
      console.error("❌ Failed to fetch portfolio history:", err);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchPortfolioHistory(portfolioRange);
  }, [isLoggedIn, portfolioRange]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/market/tokens", { credentials: "include" })
        .then((res) => res.json())
        .then(setTokens)
        .catch((err) =>
          console.error("❌ Failed to refresh token prices:", err)
        );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  function calculatePortfolioValue(userTokens = [], marketTokens = []) {
    if (!Array.isArray(userTokens)) return "0.00";
    return userTokens
      .reduce((sum, ut) => {
        const marketToken = marketTokens.find((mt) => mt.id === ut.token_id);
        return sum + (marketToken?.price_per_unit || 0) * ut.amount;
      }, 0)
      .toFixed(2);
  }

  function calculateTotalValue(profile = {}, marketTokens = []) {
    const portfolio = parseFloat(
      calculatePortfolioValue(profile.tokens ?? [], marketTokens)
    );
    return (portfolio + parseFloat(profile.balance || 0)).toFixed(2);
  }

  function calculateOwnedTokenCount(userTokens = []) {
    if (!Array.isArray(userTokens)) return 0;
    return userTokens.reduce((count, token) => {
      const amt = parseFloat(token.amount);
      return count + (isNaN(amt) ? 0 : amt);
    }, 0);
  }

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
    <>
      <div className="market-page">
        <div className="market-header-bar">
          <span className="market-logo-icon">🪙</span>
          <MarketHeader activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        {activeTab === "minigames" && (
          <>
            <Games />
          </>
        )}
        {activeTab === "market" && (
          <>
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
                    <p>
                      Player since{" "}
                      {new Date(profile.first_joined).getFullYear()}
                    </p>
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
                  <AnimatedNumber
                    value={Number(calculateTotalValue(profile, tokens))}
                  />
                </h2>
                <p>Total Net-Worth</p>
              </div>
            </section>
            <section className="market-bottom-wrapper">
              <div className="market-bottom-section">
                <div className="market-card balance-card">
                  <h2>
                    $
                    <AnimatedNumber value={animatedBalance} />
                  </h2>
                  <p>In-Game Balance</p>
                </div>

                <div className="market-card balance-card">
                  <h2>
                    <AnimatedNumber
                      value={Number(calculateOwnedTokenCount(profile.tokens))}
                      format={(val) =>
                        Number(val).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                  </h2>
                  <p>Tokens Owned</p>
                </div>
              </div>
            </section>

            <section className="token-section">
              <div className="token-header">
                <h2>Available Tokens</h2>
                <span>
                  {tokens.length} token{tokens.length !== 1 ? "s" : ""}{" "}
                  available
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
                        Supply:{" "}
                        {Number(token.available_supply).toLocaleString()}
                      </p>
                      <p
                        className={`token-price ${
                          token.crashed ? "crashed" : ""
                        }`}
                      >
                        {token.crashed ? (
                          <span className="token-dead-label">💀 Crashed</span>
                        ) : (
                          <>
                            $
                            <AnimatedNumber
                              value={Number(token.price_per_unit)}
                            />
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selectedToken && (
              <TokenModal
                token={selectedToken}
                onClose={async () => {
                  setSelectedToken(null);
                  await fetchFreshData();
                }}
              />
            )}
          </>
        )}

        {activeTab === "profile" && (
          <section className="profile-tab">
            <div className="market-card profile-info enhanced-profile">
              <div className="profile-left">
                <ProfileSkinViewer username={profile.name} />
              </div>

              <div className="profile-right">
                <h2>Profile Info</h2>
                <div className="info-grid">
                  <div className="info-pair">
                    <span className="label">Name</span>
                    <span className="value">{profile.name}</span>
                  </div>
                  <div className="info-pair">
                    <span className="label">UUID</span>
                    <span className="value uuid">{profile.uuid}</span>
                  </div>
                  <div className="info-pair">
                    <span className="label">First Joined</span>
                    <span className="value">
                      {new Date(profile.first_joined).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-pair">
                    <span className="label">Last Seen</span>
                    <span className="value">
                      {new Date(profile.last_seen).toLocaleString()}
                    </span>
                  </div>
                  <div className="info-pair">
                    <span className="label">Playtime</span>
                    <span className="value">
                      {(profile.play_time_seconds / 3600).toFixed(1)} hours
                    </span>
                  </div>
                  <div className="info-pair">
                    <span className="label">Balance</span>
                    <span className="value balance">
                      $
                      {Number(profile.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="market-card portfolio-history-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <h2>
                  Total Portfolio Value: $
                  {Number(
                    calculatePortfolioValue(profile.tokens, tokens)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h2>
                <div className="portfolio-range-buttons">
                  {["7d", "30d", "all"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setPortfolioRange(range)}
                      className={portfolioRange === range ? "active" : ""}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {portfolioHistory.length > 0 ? (
                <PortfolioHistoryChart data={portfolioHistory} />
              ) : (
                <p style={{ textAlign: "center", padding: "1rem" }}>
                  No history data available.
                </p>
              )}
            </div>
            <div className="market-card owned-tokens">
              <h2 style={{ marginBottom: "1rem" }}>Owned Tokens</h2>
              <div className="token-grid">
                {profile.tokens?.length ? (
                  profile.tokens.map((token) => (
                    <button
                      className="token-card-button"
                      key={token.token_id}
                      onClick={() => {
                        const fullToken = tokens.find(
                          (t) => t.id === token.token_id
                        );
                        if (fullToken) {
                          setSelectedToken({
                            ...fullToken,
                            ownedAmount: token.amount,
                            purchasePrice: token.price_at_purchase,
                          });
                        }
                      }}
                    >
                      <div className="token-card-content">
                        <div className="token-header">
                          <h3 className="token-name">{token.name}</h3>
                          <div className="token-symbol-pill">
                            {token.symbol}
                          </div>
                        </div>
                        <p className="token-supply">
                          Owned: {Number(token.amount).toLocaleString()}
                        </p>
                        <p
                          className={`token-price ${
                            tokens.find((t) => t.id === token.token_id)?.crashed
                              ? "crashed"
                              : ""
                          }`}
                        >
                          {tokens.find((t) => t.id === token.token_id)
                            ?.crashed ? (
                            <span className="token-dead-label">💀 Crashed</span>
                          ) : (
                            <>
                              $
                              <AnimatedNumber
                                value={Number(
                                  (tokens.find((t) => t.id === token.token_id)
                                    ?.price_per_unit || 0) * token.amount
                                )}
                              />
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p>You don't own any tokens yet.</p>
                )}
              </div>
            </div>
            <div className="market-card transaction-history">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2>Recent Transactions</h2>
                <button
                  onClick={fetchTransactionHistory}
                  className={`refresh-button ${
                    isRefreshingHistory ? "spinning" : ""
                  }`}
                  disabled={isRefreshingHistory}
                >
                  {isRefreshingHistory ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {transactionHistory.length === 0 ? (
                <p>No transactions yet.</p>
              ) : (
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Token</th>
                      <th>Amount</th>
                      <th>Price/Unit</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map((tx) => (
                      <tr key={tx.id}>
                        <td className={`buysell tx-type ${tx.type}`}>
                          {tx.type}
                        </td>
                        <td>
                          {tx.token_name} ({tx.token_symbol})
                        </td>
                        <td>{Number(tx.amount).toLocaleString()}</td>
                        <td>${Number(tx.price_at_transaction).toFixed(2)}</td>
                        <td>
                          $
                          {Number(
                            tx.price_at_transaction * tx.amount
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td>{new Date(tx.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
        {selectedToken && (
          <TokenModal
            token={selectedToken}
            ownedAmount={selectedToken.ownedAmount}
            purchasePrice={selectedToken.purchasePrice}
            onClose={async () => {
              setSelectedToken(null);
              await fetchFreshData();
            }}
          />
        )}
      </div>
    </>
  );
}

export default Market;
