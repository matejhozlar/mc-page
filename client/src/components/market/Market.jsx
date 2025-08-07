import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import MarketLoginButton from "../MarketLoginButton.jsx";
import LoadingSpinner from "../LoadingSpinner.jsx";

// Context - Data
import MarketUserProvider from "./context/MarketUserProvider.jsx";

function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/validate", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(data.valid))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading..." />;

  if (!isLoggedIn) {
    return (
      <div className="crypto-login-required">
        <p>You must be logged in to access the market.</p>
        <MarketLoginButton />
      </div>
    );
  }

  return (
    <MarketUserProvider>
      <Outlet />
    </MarketUserProvider>
  );
}

export default Market;
