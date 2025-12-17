import React, { useEffect, useState } from "react";
import ProfileSkinViewer from "./ProfileSkinViewer.jsx";
import "./css/CryptoMarket.css";

const ResponsiveProfileViewer = ({ username, uuid }) => {
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1180);

  useEffect(() => {
    const handleResize = () => {
      setIsWideScreen(window.innerWidth >= 1180);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isWideScreen ? (
    <ProfileSkinViewer username={username} />
  ) : (
    <img
      className="user-avatar"
      src={`https://mc-heads.net/avatar/${uuid}/64`}
      alt={`${username}'s avatar`}
    />
  );
};

export default ResponsiveProfileViewer;
