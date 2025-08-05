import React from "react";

function CryptoMarketHeader({ activeTab, setActiveTab }) {
  return (
    <div className="crypto-nav-header">
      <button
        className={`crypto-tab ${activeTab === "crypto" ? "active" : ""}`}
        onClick={() => setActiveTab("crypto")}
      >
        Crypto
      </button>
      <button
        className={`crypto-tab ${activeTab === "profile" ? "active" : ""}`}
        onClick={() => setActiveTab("profile")}
      >
        Profile
      </button>
      <button
        className={`crypto-tab ${activeTab === "minigames" ? "active" : ""}`}
        onClick={() => setActiveTab("minigames")}
      >
        Games
      </button>
    </div>
  );
}

export default CryptoMarketHeader;
