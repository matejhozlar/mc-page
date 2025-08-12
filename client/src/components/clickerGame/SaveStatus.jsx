import { useRef, useState, useCallback } from "react";
import { Save, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import styles from "../css/SaveStatus.module.css";

export default function SaveStatus({ buildPayload, disabled = false }) {
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  const inFlight = useRef(false);
  const latestQueued = useRef(null);

  const doSave = useCallback(async () => {
    if (inFlight.current) return;
    const payload = latestQueued.current || buildPayload();
    latestQueued.current = null;
    inFlight.current = true;
    setState("saving");
    setMsg("");

    const backoffs = [500, 1000, 2000];

    for (let i = 0; i <= backoffs.length; i++) {
      try {
        const res = await fetch("/api/game-data", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error("Server rejected save");
        setState("saved");
        setMsg("Saved");
        setTimeout(() => setState("idle"), 1200);
        break;
      } catch {
        if (i < backoffs.length) {
          await new Promise((r) => setTimeout(r, backoffs[i]));
        } else {
          setState("error");
          setMsg("Save failed");
        }
      }
    }

    inFlight.current = false;
    if (latestQueued.current) doSave();
  }, [buildPayload]);

  const queueSave = useCallback(() => {
    if (disabled) return;
    latestQueued.current = buildPayload();
    doSave();
  }, [buildPayload, doSave, disabled]);

  const Icon =
    state === "saving"
      ? Loader2
      : state === "saved"
      ? CheckCircle2
      : state === "error"
      ? AlertTriangle
      : Save;

  return (
    <div className={styles.wrap} aria-live="polite">
      <button
        type="button"
        onClick={queueSave}
        disabled={disabled || state === "saving"}
        className={`${styles.btn} ${
          state === "saving"
            ? styles.btnSaving
            : state === "error"
            ? styles.btnError
            : state === "saved"
            ? styles.btnSaved
            : ""
        }`}
        aria-busy={state === "saving"}
      >
        <Icon size={16} className={state === "saving" ? styles.spin : ""} />
        <span className={styles.btnLabel}>
          {state === "saving" ? "Saving…" : "Save"}
        </span>
      </button>

      <span
        className={`${styles.pill} ${
          state === "saved"
            ? styles.pillOk
            : state === "error"
            ? styles.pillErr
            : styles.pillIdle
        }`}
        role="status"
      >
        {state === "saving" && "Saving…"}
        {state === "saved" && msg}
        {state === "error" && (
          <>
            {msg} ·{" "}
            <button
              className={styles.link}
              onClick={queueSave}
              disabled={disabled}
            >
              Retry
            </button>
          </>
        )}
      </span>
    </div>
  );
}
