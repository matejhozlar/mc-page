import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo/logo.png";
import { FaPaypal } from "react-icons/fa";
import { FiHome } from "react-icons/fi";

const Sidebar = () => {
  const [playerCount, setPlayerCount] = useState(0);
  const [serverOnline, setServerOnline] = useState(true);
  const maxPlayers = 20;

  const fetchPlayerCount = async () => {
    try {
      const response = await fetch("/api/playerCount");
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      setPlayerCount(data.count);
      setServerOnline(true);
    } catch (error) {
      console.error("Error fetching player count:", error);
      setServerOnline(false);
      setPlayerCount(0);
    }
  };

  useEffect(() => {
    fetchPlayerCount();
    const intervalId = setInterval(fetchPlayerCount, 10000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="sidebar">
      {/* Header Section */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo-img-btn">
          <div className="sidebar-logo">
            <img src={logo} alt="Logo" className="sidebar-logo-img" />
          </div>
        </NavLink>
        <div className="sidebar-title">Create Rington</div>
      </div>

      {/* Server Status Section */}
      <div className="server-status">
        <div className="status-indicator">
          <div
            className={`status-dot ${serverOnline ? "online" : "offline"}`}
          ></div>
          <span
            className="status-text"
            style={{ color: serverOnline ? "#22c55e" : "#ef4444" }}
          >
            {serverOnline ? "Online" : "Offline"}
          </span>
        </div>
        {serverOnline ? (
          <div className="player-count">
            {playerCount} / {maxPlayers} Players
          </div>
        ) : null}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/" className="nav-link">
              <FiHome className="nav-icon" />
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/server-chat" className="nav-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Server Chat
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/online-players" className="nav-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Online Players
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/blue-map" className="nav-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              Dynmap
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/apply-to-join" className="nav-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Apply to Join
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/rules" className="nav-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Rules
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Footer Section */}
      <div className="sidebar-footer">
        <a
          href="https://discord.gg/your-discord-invite-link"
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="discord-icon-sidebar"
          >
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
          Join our Discord
        </a>
        <a
          href="https://www.paypal.com/donate/?hosted_button_id=FXA9DST7GHZ9A"
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link-donate"
        >
          <FaPaypal className="paypal" />
          Donate
        </a>
      </div>
    </div>
  );
};

export default Sidebar;
