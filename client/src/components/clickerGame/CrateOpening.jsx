import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "../css/CrateOpening.module.css";
import { RARITY_TIERS, materialNames } from "./data/toolData";

const CrateOpening = ({
  isOpen,
  items,
  finalItem,
  finalIndex,
  randomOffset = 0.5,
  onComplete,
  onClose,
}) => {
  const [scrollX, setScrollX] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [showGlowEffect, setShowGlowEffect] = useState(false);
  const animationFrameRef = useRef(null);
  const timeoutsRef = useRef([]);
  const isMountedRef = useRef(true);
  const containerRef = useRef(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const skipAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (containerRef.current && finalIndex !== null) {
      const firstItem = containerRef.current.querySelector(`.${styles.item}`);
      const itemWidth = firstItem ? firstItem.offsetWidth : 120;

      const trackElement = containerRef.current.querySelector(
        `.${styles.scrollTrack}`
      );
      const gap = trackElement
        ? parseInt(window.getComputedStyle(trackElement).gap) || 12
        : 12;

      const containerWidth = containerRef.current.clientWidth;
      const totalItemWidth = itemWidth + gap;

      const itemOffset = (randomOffset - 0.5) * itemWidth * 0.25;
      const targetX =
        -(finalIndex * totalItemWidth) +
        containerWidth / 2 -
        itemWidth / 2 +
        itemOffset;

      setScrollX(targetX);
    }

    setIsSpinning(false);
    setHasRevealed(true);
    setShowGlowEffect(true);
  }, [finalIndex, randomOffset]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !items || finalIndex === null) return;

    setIsSpinning(true);
    setHasRevealed(false);
    setShowGlowEffect(false);
    setScrollX(0);

    const startAnimationTimeout = setTimeout(() => {
      if (!isMountedRef.current) return;

      if (!containerRef.current) {
        console.error("Scroll container not found!");
        return;
      }

      const firstItem = containerRef.current.querySelector(`.${styles.item}`);
      const itemWidth = firstItem ? firstItem.offsetWidth : 120;

      const trackElement = containerRef.current.querySelector(
        `.${styles.scrollTrack}`
      );
      const gap = trackElement
        ? parseInt(window.getComputedStyle(trackElement).gap) || 12
        : 12;

      const containerWidth = containerRef.current.clientWidth;
      const totalItemWidth = itemWidth + gap;

      const itemOffset = (randomOffset - 0.5) * itemWidth * 0.25;
      const targetX =
        -(finalIndex * totalItemWidth) +
        containerWidth / 2 -
        itemWidth / 2 +
        itemOffset;

      const duration = 5000;
      const startTime = performance.now();
      const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

      const animate = (currentTime) => {
        if (!isMountedRef.current) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuart(progress);
        const currentX = targetX * easedProgress;

        setScrollX(currentX);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsSpinning(false);
          setShowGlowEffect(true);

          const revealTimeout = setTimeout(() => {
            if (!isMountedRef.current) return;
            setHasRevealed(true);
          }, 300);
          timeoutsRef.current.push(revealTimeout);

          const completeTimeout = setTimeout(() => {
            if (!isMountedRef.current) return;
            onCompleteRef.current();
          }, 3500);
          timeoutsRef.current.push(completeTimeout);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }, 50);

    timeoutsRef.current.push(startAnimationTimeout);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, items, finalIndex, randomOffset]);

  if (!isOpen) return null;

  const getRarityData = (rarity) => RARITY_TIERS[rarity] || RARITY_TIERS.COMMON;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Opening Loot Crate...</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSpinning}
          >
            ✕
          </button>
        </div>

        <div className={styles.scrollWrapper}>
          <div className={styles.centerIndicator} />
          <div className={styles.centerGlow} />

          <div className={styles.scrollContainer} ref={containerRef}>
            <div
              className={styles.scrollTrack}
              style={{
                transform: `translateX(${scrollX}px)`,
                transition: isSpinning ? "none" : "transform 0.3s ease-out",
              }}
            >
              {items?.map((item, index) => {
                const rarityData = getRarityData(item.rarity);
                const isWinning = index === finalIndex;

                return (
                  <div
                    key={`${index}-${item.name}-${item.rarity}`}
                    className={`
                      ${styles.item} 
                      ${isWinning && hasRevealed ? styles.winningItem : ""}
                      ${isWinning && showGlowEffect ? styles.glowing : ""}
                    `}
                    style={{
                      borderColor: rarityData.color,
                      boxShadow:
                        isWinning && showGlowEffect
                          ? `0 0 30px ${rarityData.glowColor}, 0 0 60px ${rarityData.glowColor}`
                          : `0 0 10px ${rarityData.glowColor}`,
                    }}
                  >
                    <div
                      className={styles.itemRarity}
                      style={{ color: rarityData.color }}
                    >
                      {rarityData.name.toUpperCase()}
                    </div>
                    <img
                      src={
                        item.name.endsWith("_pick")
                          ? `/assets/clickerGame/models/images/${item.name}.png`
                          : `/assets/clickerGame/materials/${item.name}.png`
                      }
                      alt={item.displayName || item.name}
                      className={styles.itemImage}
                    />
                    <div className={styles.itemName}>
                      {item.displayName ||
                        materialNames[item.name] ||
                        item.name}
                    </div>
                    {item.amount > 1 && (
                      <div className={styles.itemAmount}>×{item.amount}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {hasRevealed && finalItem && (
          <div
            className={styles.resultContainer}
            style={{
              animation: "fadeInScale 0.5s ease-out",
            }}
          >
            <div className={styles.resultLabel}>YOU WON</div>
            <div
              className={styles.resultItem}
              style={{
                borderColor: getRarityData(finalItem.rarity).color,
                boxShadow: `0 0 40px ${
                  getRarityData(finalItem.rarity).glowColor
                }`,
              }}
            >
              <div
                className={styles.resultRarity}
                style={{ color: getRarityData(finalItem.rarity).color }}
              >
                {getRarityData(finalItem.rarity).name.toUpperCase()}
              </div>
              <img
                src={
                  finalItem.name.endsWith("_pick")
                    ? `/assets/clickerGame/models/images/${finalItem.name}.png`
                    : `/assets/clickerGame/materials/${finalItem.name}.png`
                }
                alt={finalItem.displayName}
                className={styles.resultImage}
              />
              <div className={styles.resultName}>
                {finalItem.displayName ||
                  materialNames[finalItem.name] ||
                  finalItem.name}
              </div>
              {finalItem.amount > 1 && (
                <div className={styles.resultAmount}>×{finalItem.amount}</div>
              )}
            </div>
          </div>
        )}

        {isSpinning && (
          <button className={styles.skipBtn} onClick={skipAnimation}>
            Skip Animation
          </button>
        )}
      </div>
    </div>
  );
};

export default CrateOpening;
