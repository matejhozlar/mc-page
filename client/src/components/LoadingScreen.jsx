import React, { useEffect } from "react";
import "./css/LoadingScreen.css";

const LoadingScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loading-overlay">
      <img
        src="assets/home/images/cog.png"
        alt="Loading..."
        className="loading-cog"
      />
    </div>
  );
};

export default LoadingScreen;
