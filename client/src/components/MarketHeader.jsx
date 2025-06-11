import React from "react";

function MarketHeader({ activeTab, setActiveTab }) {
  return (
    <div className="market-nav-header">
      <button
        className={`market-tab ${activeTab === "market" ? "active" : ""}`}
        onClick={() => setActiveTab("market")}
      >
        Market
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

export default MarketHeader;
