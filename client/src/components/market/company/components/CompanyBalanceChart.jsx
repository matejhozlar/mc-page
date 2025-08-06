import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler
);

const CompanyBalanceChart = ({ history }) => {
  if (!Array.isArray(history) || history.length === 0) return null;

  const firstEntry = history[0].balance;
  const lastEntry = history[history.length - 1].balance;
  const change = lastEntry - firstEntry;
  const changeFormatted = change.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const days = history.length;
  const isUp = change >= 0;

  const chartData = {
    labels: history.map((entry) =>
      new Date(entry.recorded_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "Net Worth",
        data: history.map((entry) => Number(entry.balance)),
        fill: true,
        borderColor: "#4ade80",
        backgroundColor: "rgba(74, 222, 128, 0.12)",
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 15,
        right: 15,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#aaa",
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#aaa",
          callback: (value) => `$${Number(value).toFixed(2)}`,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1f2937",
        borderColor: "#4ade80",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: (context) =>
            `$${Number(context.parsed.y).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
        },
      },
    },
  };

  return (
    <div className="company-balance-chart">
      <h2 className="company-section-title">Net Worth</h2>
      <p className="company-chart-description">
        This company {isUp ? "grew" : "declined"} by{" "}
        <strong
          style={{
            color: isUp ? "#4ade80" : "#f87171",
          }}
        >
          ${changeFormatted}
        </strong>{" "}
        over the last{" "}
        <strong>
          {days} {days === 1 ? "day" : "days"}
        </strong>
        .
      </p>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default CompanyBalanceChart;
