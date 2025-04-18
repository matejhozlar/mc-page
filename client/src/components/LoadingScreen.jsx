import React, { useEffect } from "react";
import cog from "../assets/images/cog.png";

const LoadingScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="loading-overlay">
      <img src={cog} alt="Loading..." className="loading-cog" />
    </div>
  );
};

export default LoadingScreen;
