import React from "react";
import styles from "./css/games.module.css";
import { NavLink } from "react-router-dom";

function Games() {
  return (
    <div className={styles.gamesWrapper}>
      <div className={styles.gameCard}>
        <NavLink to="/game">
          <button className={styles.gameButton}>🎮 Play Clicker Game</button>
        </NavLink>
      </div>
      <div className={styles.gameCard}>
        <button className={styles.gameButton} disabled>
          🚧 More Coming Soon...
        </button>
      </div>
    </div>
  );
}

export default Games;
