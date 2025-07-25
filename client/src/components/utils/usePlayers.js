import PlayerContext from "../AdminPlayerProvider.jsx";
import { useContext } from "react";

export const usePlayers = () => useContext(PlayerContext);
