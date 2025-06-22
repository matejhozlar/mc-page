import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { ArcElement, Tooltip, Legend } from "chart.js";

// components
import AnimatedNumber from "./AnimatedNumber";

ChartJS.register(ArcElement, Tooltip, Legend);

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function TokenModal({
  token,
  onClose,
  ownedAmount = null,
  purchasePrice = null,
  profileBalance = null,
}) {
  const [showBuyUI, setShowBuyUI] = useState(false);
  const [showSellUI, setShowSellUI] = useState(false);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRange, setSelectedRange] = useState(
    token.symbol === "PLC" ? "7d" : "1h"
  );
  const [chartData, setChartData] = useState([]);
  const [priceChange, setPriceChange] = useState(null);
  const [isPriceUp, setIsPriceUp] = useState(true);
  const [distribution, setDistribution] = useState([]);
  const [showAllOwners, setShowAllOwners] = useState(false);
  const [livePrice, setLivePrice] = useState(() => {
    const parsed = Number(token?.price_per_unit);
    return isNaN(parsed) ? 0 : parsed;
  });
  const [lastTxTime, setLastTxTime] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [buyMode, setBuyMode] = useState("amount");
  const [moneyInput, setMoneyInput] = useState("");
  const [tokenTVL, setTokenTVL] = useState(null);

  const isMemecoin = token.is_memecoin === true;
  const unitPrice = Number(token.price_per_unit);
  const quantity = Number(amount || 0);
  const baseTotal = unitPrice * quantity;
  const taxRate = isMemecoin ? 0.05 : 0;
  const taxAmount = baseTotal * taxRate;
  const totalWithTax = baseTotal + taxAmount;
  const netGain = baseTotal - taxAmount;
  const isCrashed = !!token.crashed || livePrice <= 0;

  useEffect(() => {
    const parsed = Number(token?.price_per_unit);
    if (!isNaN(parsed)) {
      setLivePrice(parsed);
    }
  }, [token?.price_per_unit]);

  const calculatePercentageChange = (livePrice, purchasePrice) => {
    if (!purchasePrice || purchasePrice <= 0) return 0;
    const percentage = ((livePrice - purchasePrice) / purchasePrice) * 100;
    return percentage.toFixed(2);
  };

  const ranges =
    token.symbol === "PLC" ? ["7d"] : ["1h", "24h", "7d", "30d", "all"];

  const handleTransaction = async (type) => {
    const endpoint = type === "buy" ? "/api/market/buy" : "/api/market/sell";

    if (type === "buy" && token.symbol === "PLC") {
      setError(
        "The PLC token cannot be bought. It can only be earned or sold."
      );
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tokenId: token.id,
          amount: Number(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.cooldown) {
          setCooldownRemaining(data.cooldown);
          setError(`Cooldown active — try again in ${data.cooldown} seconds`);
          return;
        }

        throw new Error(data.error || `${type} failed`);
      }

      setSuccess(`Successfully ${type === "buy" ? "bought" : "sold"} tokens!`);
      const now = Date.now();
      setLastTxTime(now);
      const updatedCooldowns = {
        ...JSON.parse(localStorage.getItem("tokenCooldowns") || "{}"),
        [token.id]: now,
      };
      localStorage.setItem("tokenCooldowns", JSON.stringify(updatedCooldowns));
      setCooldownRemaining(180);
      setError("");
      setAmount(1);
      setShowBuyUI(false);
      setShowSellUI(false);
    } catch (err) {
      setError(err.message);
      setSuccess("");
    }
  };

  const handleBuyClick = () => {
    setShowBuyUI(true);
    setShowSellUI(false);
    setSuccess("");
    setError("");
  };

  const handleSellClick = () => {
    setShowSellUI(true);
    setShowBuyUI(false);
    setSuccess("");
    setError("");
  };

  useEffect(() => {
    const txTimes = JSON.parse(localStorage.getItem("tokenCooldowns") || "{}");
    const tokenLastTxTime = txTimes[token.id];
    if (tokenLastTxTime) {
      const elapsed = Math.floor((Date.now() - tokenLastTxTime) / 1000);
      const remaining = 180 - elapsed;
      if (remaining > 0) {
        setCooldownRemaining(remaining);
        setLastTxTime(tokenLastTxTime);
      }
    }
  }, [token.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchTokenTVL = async () => {
      try {
        const res = await fetch(`/api/market/tvl/${token.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (isMounted && data.tvl_usd !== undefined) {
          setTokenTVL(data.tvl_usd);
        }
      } catch (err) {
        console.error("Failed to fetch token TVL:", err);
      }
    };

    fetchTokenTVL();
    const interval = setInterval(fetchTokenTVL, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token.id]);

  useEffect(() => {
    if (!lastTxTime) return;

    const interval = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - lastTxTime) / 1000);
      const remaining = 180 - secondsPassed;
      setCooldownRemaining(remaining > 0 ? remaining : 0);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastTxTime]);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `/api/market/token-history/${token.id}?range=${selectedRange}`,
          { credentials: "include" }
        );
        const data = await res.json();

        if (!isMounted || !Array.isArray(data)) return;

        setChartData(data);

        if (data.length >= 2) {
          const start = Number(data[0].price);
          const end = Number(data[data.length - 1].price);

          if (!isNaN(start) && !isNaN(end)) {
            const percentChange = ((end - start) / start) * 100;
            setLivePrice(end);
            setPriceChange(percentChange.toFixed(2));
            setIsPriceUp(end >= start);
          } else {
            console.warn("Invalid price data in chart history", {
              start,
              end,
              data,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load price history:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token.id, selectedRange]);

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        const res = await fetch(`/api/market/token-distribution/${token.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setDistribution(data);
      } catch (err) {
        console.error("Failed to load token distribution:", err);
      }
    };

    fetchDistribution();
  }, [token.id]);

  useEffect(() => {
    if (buyMode === "money") {
      const dollars = parseFloat(moneyInput);
      if (!isNaN(dollars) && livePrice > 0) {
        const baseAmount = dollars / (1 + taxRate);
        const calculatedAmount = baseAmount / livePrice;
        setAmount(Number(calculatedAmount.toPrecision(15)));
      }
    }
  }, [moneyInput, livePrice, buyMode, taxRate]);

  const totalOwned = distribution.reduce((sum, d) => sum + Number(d.amount), 0);
  const unownedAmount = Math.max(0, Number(token.total_supply) - totalOwned);

  const doughnutData = {
    labels: [...distribution.map((entry) => entry.username), "Unowned"],
    datasets: [
      {
        label: "Token Distribution",
        data: [...distribution.map((entry) => entry.amount), unownedAmount],
        backgroundColor: [...distribution.map(() => "#ffcb05"), "#666"],
        borderWidth: 1,
      },
    ],
  };

  const formattedChartData = {
    labels: Array.isArray(chartData)
      ? chartData.map((entry) => new Date(entry.recorded_at).toLocaleString())
      : [],
    datasets: [
      {
        label: `${token.symbol} Price`,
        data: Array.isArray(chartData)
          ? chartData.map((entry) => Number(entry.price))
          : [],
        borderColor: "#ffcb05",
        tension: 0.3,
        fill: false,
      },
    ],
  };

  return (
    <div className="token-modal-overlay" onClick={onClose}>
      <div className="token-modal" onClick={(e) => e.stopPropagation()}>
        {isCrashed && (
          <p
            style={{ color: "#ff4d4f", fontWeight: "bold", marginTop: "1rem" }}
          >
            💀 This token has crashed and is no longer tradable.
          </p>
        )}
        <button className="token-modal-close" onClick={onClose}>
          ×
        </button>
        <h2>
          {token.name} <span>({token.symbol})</span>{" "}
          {priceChange !== null && (
            <span
              style={{
                color: isPriceUp ? "limegreen" : "#ff4d4f",
                fontWeight: 600,
                marginLeft: "0.5rem",
              }}
            >
              {isPriceUp ? "+" : ""}
              {priceChange}%
            </span>
          )}
        </h2>

        <p className="token-modal-description">
          {token.description || "No description provided."}
        </p>

        <div className="token-modal-details">
          <p>
            <strong>Available Supply:</strong>{" "}
            {Number(token.available_supply).toLocaleString()}
          </p>
          <p>
            <strong>Total Supply:</strong>{" "}
            {Number(token.total_supply).toLocaleString()}
          </p>
          {tokenTVL !== null && tokenTVL !== 0 && (
            <p>
              <strong>Total Value Locked (TVL):</strong> $
              {Number(tokenTVL).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
          <p>
            <strong>Price per Token:</strong> $
            <AnimatedNumber
              value={Number.isFinite(livePrice) ? livePrice.toFixed(4) : 0}
            />
          </p>
          {ownedAmount !== null && (
            <>
              {purchasePrice !== null && (
                <p>
                  <strong>Purchased At:</strong> $
                  {Number(purchasePrice).toLocaleString()}
                  <span
                    style={{
                      color:
                        livePrice >= purchasePrice ? "limegreen" : "#ff4d4f",
                      fontWeight: 600,
                      marginLeft: "0.5rem",
                    }}
                  >
                    ({calculatePercentageChange(livePrice, purchasePrice)}%)
                  </span>
                </p>
              )}

              <p>
                <strong>Owned:</strong> {Number(ownedAmount).toLocaleString()}{" "}
                {token.symbol}
              </p>
            </>
          )}
        </div>

        {!showBuyUI && !showSellUI && !isCrashed && (
          <div className="token-modal-actions">
            <div className="token-modal-actions">
              <button
                className="token-buy-button"
                onClick={handleBuyClick}
                disabled={cooldownRemaining > 0}
              >
                {cooldownRemaining > 0
                  ? `Wait ${cooldownRemaining}s`
                  : "Buy Token"}
              </button>
              <button
                className="token-sell-button"
                onClick={handleSellClick}
                disabled={cooldownRemaining > 0}
              >
                {cooldownRemaining > 0
                  ? `Wait ${cooldownRemaining}s`
                  : "Sell Token"}
              </button>
            </div>
          </div>
        )}

        {(showBuyUI || showSellUI) && !isCrashed && (
          <div className="token-modal-transaction">
            <div className="buy-mode-wrapper">
              <div className="buy-mode-input-group">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={buyMode === "money" ? moneyInput : amount}
                  onChange={(e) =>
                    buyMode === "money"
                      ? setMoneyInput(e.target.value)
                      : setAmount(e.target.value)
                  }
                  className="buy-mode-input"
                  placeholder={
                    showBuyUI
                      ? buyMode === "money"
                        ? "Amount in USD"
                        : `Amount in ${token.symbol}`
                      : `Amount in ${token.symbol}`
                  }
                />
                {showSellUI && (
                  <div
                    className="buy-mode-balance"
                    style={{
                      marginTop: "0.3rem",
                      fontSize: "0.9rem",
                      color: "#999",
                    }}
                  >
                    Holdings: {Number(ownedAmount || 0)}
                  </div>
                )}

                {showBuyUI && (
                  <button
                    className="toggle-buy-mode"
                    onClick={() =>
                      setBuyMode((prev) =>
                        prev === "money" ? "amount" : "money"
                      )
                    }
                  >
                    {buyMode === "money" ? "USD" : token.symbol}
                  </button>
                )}
              </div>

              {showBuyUI && (
                <div className="buy-mode-balance">
                  {buyMode === "money" ? (
                    <>Balance: ${Number(profileBalance).toFixed(2)}</>
                  ) : (
                    <>
                      Holdings:{" "}
                      {Number(ownedAmount || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}{" "}
                      {token.symbol}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="buy-summary">
              {showBuyUI ? (
                <>
                  <strong>Total:</strong> $
                  {buyMode === "money"
                    ? parseFloat(moneyInput || 0).toFixed(2)
                    : totalWithTax.toFixed(2)}
                  {isMemecoin && (
                    <div className="tax-note">
                      Includes 5% tax for memecoin purchase ($
                      {taxAmount.toFixed(2)})
                    </div>
                  )}
                </>
              ) : (
                <>
                  <strong>Net Gain:</strong> $
                  {netGain.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {isMemecoin && (
                    <div className="tax-note">
                      5% memecoin tax will be deducted (${taxAmount.toFixed(2)})
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              className="token-buy-button"
              onClick={() => handleTransaction(showBuyUI ? "buy" : "sell")}
            >
              Confirm {showBuyUI ? "Purchase" : "Sale"}
            </button>
            <button
              className="token-cancel-button"
              onClick={() => {
                setShowBuyUI(false);
                setShowSellUI(false);
                setAmount(1);
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {error && <p className="buy-error">{error}</p>}
        {success && <p className="buy-success">{success}</p>}

        <div className="token-modal-chart">
          {chartData.length > 0 ? (
            <Line
              data={formattedChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    ticks: {
                      callback: function (value, index, ticks) {
                        const label = this.getLabelForValue(value);
                        const date = new Date(label);
                        return date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      },
                      maxRotation: 0,
                      autoSkip: true,
                    },
                  },
                  y: {
                    ticks: {
                      callback: function (value) {
                        return `$${value.toFixed(5)}`;
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <p className="chart-placeholder">No chart data available</p>
          )}
        </div>

        <div className="token-range-filters">
          {ranges.map((range) => (
            <button
              key={range}
              className={selectedRange === range ? "active" : ""}
              onClick={() => setSelectedRange(range)}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="distribution-chart-section">
          <h3>Ownership Distribution</h3>
          <div className="doughnut-chart-wrapper">
            <Doughnut data={doughnutData} />
          </div>

          <ul className="top-owners-list">
            {distribution
              .slice(0, showAllOwners ? distribution.length : 3)
              .map((entry, idx) => {
                const percent = (
                  (entry.amount / token.total_supply) *
                  100
                ).toFixed(2);
                return (
                  <li key={entry.username}>
                    <strong>{idx + 1}.</strong> {entry.username} - {percent}%
                  </li>
                );
              })}
            {distribution.length > 3 && (
              <li>
                <button onClick={() => setShowAllOwners(!showAllOwners)}>
                  {showAllOwners ? "Show Less" : "Show All"}
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TokenModal;
