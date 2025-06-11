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

function PortfolioHistoryChart({ data }) {
  const chartData = {
    labels: data.map((entry) => new Date(entry.recorded_at).toLocaleString()),
    datasets: [
      {
        label: "Portfolio Value ($)",
        data: data.map((entry) => Number(entry.total_value)),
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        tension: 0.3,
        pointRadius: 2,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          callback: function (value, index, ticks) {
            const label = this.getLabelForValue(value);
            const date = new Date(label);
            return date.toLocaleDateString();
          },
        },
      },
      y: {
        ticks: {
          callback: function (value) {
            return `$${value.toFixed(2)}`;
          },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            return `$${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "300px", marginTop: "1rem" }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default PortfolioHistoryChart;
