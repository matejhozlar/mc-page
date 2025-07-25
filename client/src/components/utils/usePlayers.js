import { useContext, createContext } from "react";

const PlayerContext = createContext();

export const usePlayers = () => useContext(PlayerContext);
