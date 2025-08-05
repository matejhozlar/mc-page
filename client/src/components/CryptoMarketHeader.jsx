import React from "react";

function CryptoMarketHeader({ activeTab, setActiveTab }) {
  return (
    <div className="market-nav-header">
      <button
        className={`market-tab ${activeTab === "crypto" ? "active" : ""}`}
        onClick={() => setActiveTab("crypto")}
      >
        Crypto
      </button>
      <button
        className={`market-tab ${activeTab === "profile" ? "active" : ""}`}
        onClick={() => setActiveTab("profile")}
      >
        Profile
      </button>
      <button
        className={`market-tab ${activeTab === "minigames" ? "active" : ""}`}
        onClick={() => setActiveTab("minigames")}
      >
        Games
      </button>
    </div>
  );
}

export default CryptoMarketHeader;
