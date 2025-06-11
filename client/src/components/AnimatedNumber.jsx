import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const start = previous.current;
    const diff = value - start;
    const startTime = performance.now();

    const update = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + diff * progress;
      setDisplay(current.toFixed(2));

      if (progress < 1) requestAnimationFrame(update);
      else previous.current = value;
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return (
    <span>
      {Number(display).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

export default AnimatedNumber;
