import "./css/LoadingSpinner.css";

const LoadingSpinner = ({ message }) => {
  return (
    <div className="spinner-overlay">
      <div className="spinner-box">
        <div className="spinner" />
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
