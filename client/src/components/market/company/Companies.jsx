import React from "react";
import { useMarketUser } from "../../../hooks/market/marketUserContext.js";
import LoadingSpinner from "../../LoadingSpinner.jsx";

// Components
import MarketUserProfile from "./components/MarketUserProfile.jsx";

function Companies() {
  const { user, loading } = useMarketUser();

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (!user) return <p>Unable to load user data.</p>;

  return <MarketUserProfile />;
}

export default Companies;
