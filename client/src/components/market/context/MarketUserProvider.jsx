import { useState, useEffect } from "react";
import { MarketUserContext } from "../../../hooks/market/marketUserContext.js";

const MarketUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("❌ Failed to fetch market user:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MarketUserContext.Provider value={{ user, loading }}>
      {children}
    </MarketUserContext.Provider>
  );
};

export default MarketUserProvider;
