// components/TokenModal.jsx
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

function TokenModal({ token, onClose }) {
  if (!token) return null;

  return (
    <div className="token-modal-overlay" onClick={onClose}>
      <div className="token-modal" onClick={(e) => e.stopPropagation()}>
        <button className="token-modal-close" onClick={onClose}>
          ×
        </button>
        <h2>
          {token.name} <span>({token.symbol})</span>
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
          <p>
            <strong>Price:</strong> ${Number(token.price_per_unit).toFixed(2)}
          </p>
        </div>

        <div className="token-modal-chart">
          <Line
            data={{
              labels: ["1d", "3d", "5d", "7d"],
              datasets: [
                {
                  label: `${token.symbol} Price`,
                  data: [1.0, 1.2, 1.15, 1.3],
                  borderColor: "#ffcb05",
                  tension: 0.3,
                  fill: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </div>

        <button className="token-buy-button">Buy Token</button>
      </div>
    </div>
  );
}

export default TokenModal;
