import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function TokenChartPage() {
  const { symbol } = useParams();
  const [data, setData] = useState([]);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [priceChange, setPriceChange] = useState(null);
  const [isPriceUp, setIsPriceUp] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tokensRes, historyRes] = await Promise.all([
          fetch("/api/market/tokens", { credentials: "include" }),
          fetch(`/api/market/token-history-by-symbol/${symbol}?range=1h`, {
            credentials: "include",
          }),
        ]);

        const tokens = await tokensRes.json();
        const history = await historyRes.json();

        if (Array.isArray(history) && history.length >= 2) {
          const start = Number(history[0].price);
          const end = Number(history[history.length - 1].price);
          const percentChange = ((end - start) / start) * 100;
          setPriceChange(percentChange.toFixed(2));
          setIsPriceUp(end >= start);
        }

        if (Array.isArray(tokens)) {
          const match = tokens.find(
            (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
          );
          setTokenInfo(match || null);
        }

        if (Array.isArray(history)) {
          setData(history);
        } else {
          console.warn("⚠️ Unexpected chart data format:", history);
          setData([]);
        }
      } catch (error) {
        console.error("❌ Error loading token chart data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const chartData = {
    labels: data.map((entry) =>
      new Date(entry.recorded_at).toLocaleTimeString()
    ),
    datasets: [
      {
        label: `${symbol.toUpperCase()} Price`,
        data: data.map((entry) => Number(entry.price)),
        borderColor: "#ffcb05",
        tension: 0.3,
      },
    ],
  };

  // Format the numbers with 0 decimals
  const formatSupply = (number) => {
    return Number(number).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div
      style={{
        background: "#111",
        color: "white",
        padding: "30px",
        fontFamily: "sans-serif",
      }}
      className="chart-container"
    >
      {tokenInfo && Number(tokenInfo?.price_per_unit) === 0 && (
        <p style={{ color: "#ff4d4f", fontWeight: "bold", marginTop: "1rem" }}>
          💀 This token has crashed and is no longer tradable.
        </p>
      )}
      <h1 style={{ marginBottom: 20 }}>
        {tokenInfo?.name || "Unknown Token"}{" "}
        <span>({symbol.toUpperCase()})</span>
        {priceChange !== null && (
          <span
            style={{
              color: isPriceUp ? "limegreen" : "#ff4d4f",
              fontWeight: 600,
              marginLeft: "1rem",
            }}
          >
            {isPriceUp ? "+" : ""}
            {priceChange}%
          </span>
        )}
      </h1>

      {/* Display token information */}
      {tokenInfo && (
        <div style={{ marginBottom: 20 }}>
          <p>
            <strong>Price per Token:</strong> $
            {Number(tokenInfo.price_per_unit).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p>
            <strong>Total Supply:</strong>{" "}
            {formatSupply(tokenInfo.total_supply)}
          </p>
          <p>
            <strong>Available Supply:</strong>{" "}
            {formatSupply(tokenInfo.available_supply)}
          </p>
        </div>
      )}

      {loading ? (
        <p>Loading chart...</p>
      ) : data.length === 0 ? (
        <p>No chart data available for this token.</p>
      ) : (
        <div
          className="chart-wrapper"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: {
                padding: 0,
              },
              scales: {
                y: {
                  ticks: {
                    callback: function (value) {
                      return `$${value.toFixed(5)}`;
                    },
                  },
                },
              },
            }}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "500px", // Optional max-height
            }}
          />
        </div>
      )}
    </div>
  );
}

export default TokenChartPage;
