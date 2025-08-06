import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import PropTypes from "prop-types";

// Register Chart.js modules
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

const CompanyBalanceChart = ({ history }) => {
  if (!history || history.length === 0) return null;

  const chartData = {
    labels: history.map((entry) => new Date(entry.recorded_at)),
    datasets: [
      {
        label: "Net Worth",
        data: history.map((entry) => entry.balance),
        fill: true,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
          tooltipFormat: "PP",
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `$${Number(value).toFixed(2)}`;
          },
        },
      },
    },
  };

  return (
    <div className="company-balance-chart">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

CompanyBalanceChart.propTypes = {
  history: PropTypes.array.isRequired,
};

export default CompanyBalanceChart;
