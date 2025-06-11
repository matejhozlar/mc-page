import React from "react";
import styles from "./css/games.module.css";

function Games() {
  return (
    <div className={styles.gamesWrapper}>
      <div className={styles.gameCard}>
        <a
          href="https://create-rington.com/game"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className={styles.gameButton}>🎮 Play Clicker Game</button>
        </a>
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
