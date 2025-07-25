import { useContext } from "react";
import { PlayerContext } from "./PlayerContext.js";

export const usePlayers = () => useContext(PlayerContext);
