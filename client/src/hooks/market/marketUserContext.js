import { createContext, useContext } from "react";

export const MarketUserContext = createContext();

export const useMarketUser = () => useContext(MarketUserContext);
