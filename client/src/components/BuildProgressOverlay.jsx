import React, { useEffect, useMemo, useState } from "react";
import "./css/LoadingSpinner.css";
import "./css/BuildProgressOverlay.css";

const DEFAULT_DURATION = 30000;

const COMPANY_NEW_STEPS = [
  "Creating company entry…",
  "Linking founder and roles…",
  "Preparing company funds…",
  "Publishing images…",
  "Finalizing and propagating…",
];

const SHOP_NEW_STEPS = [
  "Creating shop entry…",
  "Linking to company…",
  "Publishing images…",
  "Preparing item listings…",
  "Finalizing and propagating…",
];

const EDIT_STEPS = [
  "Applying text changes…",
  "Replacing logo/banner…",
  "Updating gallery…",
  "Clearing caches…",
  "Finalizing changes…",
];

export default function BuildProgressOverlay({
  type = "new",
  kind = "company",
  durationMs = DEFAULT_DURATION,
  onDone,
  delayMs = 400,
}) {
  const steps = useMemo(() => {
    if (type === "edit") return EDIT_STEPS;
    return kind === "shop" ? SHOP_NEW_STEPS : COMPANY_NEW_STEPS;
  }, [type, kind]);

  const [visible, setVisible] = useState(delayMs === 0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let delayTimer;
    if (!visible) {
      delayTimer = setTimeout(() => setVisible(true), delayMs);
    }
    return () => clearTimeout(delayTimer);
  }, [visible, delayMs]);

  useEffect(() => {
    if (!visible) return;

    const perStep = Math.max(1, Math.floor(durationMs / steps.length));
    const stepTimer = setInterval(() => {
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, perStep);

    const doneTimer = setTimeout(() => {
      clearInterval(stepTimer);
      onDone?.();
    }, durationMs);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [visible, durationMs, steps.length, onDone]);

  if (!visible) return null;

  return (
    <div className="spinner-overlay">
      <div className="spinner-box" style={{ minWidth: 360 }}>
        <div className="spinner" />
        <div className="build-steps">
          <div className="build-title">
            {type === "edit"
              ? "Applying Edit…"
              : kind === "shop"
              ? "Creating Shop…"
              : "Creating Company…"}
          </div>
          <ul className="build-list">
            {steps.map((msg, i) => (
              <li
                key={i}
                className={
                  i < index
                    ? "build-item done"
                    : i === index
                    ? "build-item active"
                    : "build-item"
                }
              >
                {msg}
              </li>
            ))}
          </ul>
          <div className="build-footnote">This may take ~30 seconds.</div>
        </div>
      </div>
    </div>
  );
}
