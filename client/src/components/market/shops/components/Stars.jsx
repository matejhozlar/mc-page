import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Props:
 * - value: number (0..5, can be fractional)
 * - onChange?: (newValue:number) => void  // if present -> interactive
 * - size?: number                          // px
 * - precision?: 1 | 0.5 | 0.25             // step size for hover/keyboard
 * - readOnly?: boolean
 * - disabled?: boolean
 * - ariaLabel?: string
 */
export default function Stars({
  value = 0,
  onChange,
  size = 22,
  precision = 0.5,
  readOnly = false,
  disabled = false,
  ariaLabel = "Rating",
}) {
  const interactive = !!onChange && !readOnly && !disabled;
  const [hoverValue, setHoverValue] = useState(null);
  const rootRef = useRef(null);

  const clamp = useCallback(
    (v) => {
      const step = precision;
      const clamped = Math.min(5, Math.max(0, v));
      return Math.round(clamped / step) * step;
    },
    [precision]
  );

  const displayValue = useMemo(() => {
    const v = hoverValue ?? value ?? 0;
    return Math.max(0, Math.min(5, v));
  }, [hoverValue, value]);

  const starPercent = useCallback(
    (i) => {
      const v = displayValue;
      const fullBefore = i - 1;
      if (v <= fullBefore) return 0;
      if (v >= i) return 100;
      return (v - fullBefore) * 100;
    },
    [displayValue]
  );

  const onMouseMove = (e) => {
    if (!interactive) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const unit = rect.width / 5;
    const raw = x / unit;
    setHoverValue(clamp(raw));
  };

  const onMouseLeave = () => {
    if (!interactive) return;
    setHoverValue(null);
  };

  const onClick = () => {
    if (!interactive) return;
    if (hoverValue == null) return;
    onChange(clamp(hoverValue));
  };

  const onKeyDown = (e) => {
    if (!interactive) return;
    const step = precision;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setHoverValue((v) => clamp((v ?? value) + step));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHoverValue((v) => clamp((v ?? value) - step));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(clamp(hoverValue ?? value));
    } else if (e.key === "Escape") {
      setHoverValue(null);
    }
  };

  useEffect(() => {
    if (!interactive) setHoverValue(null);
  }, [interactive]);

  return (
    <div
      ref={rootRef}
      className="star-root"
      role={interactive ? "radiogroup" : "img"}
      aria-label={
        interactive
          ? ariaLabel
          : `${ariaLabel}: ${displayValue.toFixed(1)} of 5`
      }
      tabIndex={interactive ? 0 : -1}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{
        display: "inline-flex",
        gap: 4,
        alignItems: "center",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const pct = starPercent(idx);
        return (
          <StarSVG
            key={i}
            size={size}
            percent={pct}
            active={pct > 0}
            aria-checked={
              interactive ? Math.round(displayValue) === idx : undefined
            }
            role={interactive ? "radio" : undefined}
          />
        );
      })}
    </div>
  );
}

function StarSVG({ size, percent, active, ...rest }) {
  const id = useMemo(
    () => `starMask-${Math.random().toString(36).slice(2)}`,
    []
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...rest}
      className="star-svg"
    >
      {/* outline */}
      <path
        d="M12 2l2.95 6.33 6.98.62-5.24 4.5 1.61 6.79L12 16.9 5.7 20.24l1.61-6.79-5.24-4.5 6.98-.62L12 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.7"
      />
      {/* fill via mask/clip */}
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={(percent / 100) * 24} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2l2.95 6.33 6.98.62-5.24 4.5 1.61 6.79L12 16.9 5.7 20.24l1.61-6.79-5.24-4.5 6.98-.62L12 2z"
        clipPath={`url(#${id})`}
        fill="currentColor"
        className={active ? "star-fill-active" : "star-fill"}
      />
    </svg>
  );
}
