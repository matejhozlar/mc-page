import React, { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber.jsx";

function CryptoMarketStatsDemo() {
  // Static user info
  const [baseProfile] = useState(() => ({
    name: "saunhardy",
    uuid: "091b900c-4174-478c-900c-a0fe5a31a329",
    first_joined: new Date("2022-01-01"),
    last_seen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    play_time_seconds: 48200,
  }));

  // Dynamic numbers
  const [balance, setBalance] = useState(4200);
  const [tokenCount, setTokenCount] = useState(158);
  const [totalNetWorth, setTotalNetWorth] = useState(11234.56);

  useEffect(() => {
    const interval = setInterval(() => {
      setBalance(parseFloat((Math.random() * 10000).toFixed(2)));
      setTokenCount(Math.floor(Math.random() * 2000));
      setTotalNetWorth(
        parseFloat((balance + Math.random() * 10000).toFixed(2))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [balance]);

  return (
    <div className="market-page-demo" style={{ padding: 30 }}>
      <header className="market-header">
        <h1 className="market-title">Createrington Crypto</h1>
      </header>

      <section className="market-overview">
        <div className="market-card user-card">
          <div className="user-card-glow" />
          <div className="user-top">
            <img
              className="user-avatar"
              src={`https://crafatar.com/avatars/${baseProfile.uuid}?size=64&overlay`}
              alt={`${baseProfile.name}'s avatar`}
            />
            <div className="user-info">
              <h3>{baseProfile.name}</h3>
              <p>Player since {baseProfile.first_joined.getFullYear()}</p>
            </div>
          </div>
          <div className="user-stats">
            <div className="stat-box">
              <span className="stat-value">
                {Math.floor(baseProfile.play_time_seconds / 3600)}h
              </span>
              <span className="stat-label">Playtime</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">
                {Math.floor(
                  (Date.now() - baseProfile.last_seen.getTime()) /
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
            <AnimatedNumber value={totalNetWorth} />
          </h2>
          <p>Total Net-Worth</p>
        </div>
      </section>

      <section className="market-bottom-wrapper">
        <div className="market-bottom-section">
          <div className="market-card balance-card">
            <h2>
              $
              <AnimatedNumber value={balance} />
            </h2>
            <p>In-Game Balance</p>
          </div>

          <div className="market-card balance-card">
            <h2>
              <AnimatedNumber
                value={tokenCount}
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
    </div>
  );
}

export default CryptoMarketStatsDemo;
