import { useEffect, useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import "../../css/LocationSettingsModal.css";

const DIMENSIONS = [
  { value: "overworld", label: "Overworld" },
  { value: "nether", label: "Nether" },
  { value: "end", label: "End" },
];

const LocationSettingsModal = ({
  initial,
  onSave,
  onCancel,
  onClear,
  saving = false,
}) => {
  const [dimension, setDimension] = useState(initial?.dimension || "overworld");
  const [x, setX] = useState(initial?.x ?? "");
  const [z, setZ] = useState(initial?.z ?? "");
  const [y, setY] = useState(initial?.y ?? "");
  const [tempad, setTempad] = useState(initial?.tempad ?? "");
  const hasExisting = useMemo(
    () => initial && typeof initial.x === "number",
    [initial]
  );

  const parsed = useMemo(
    () => ({
      x: x === "" ? null : Number(x),
      z: z === "" ? null : Number(z),
      y: y === "" ? null : Number(y),
      tempad: tempad.trim() || null,
    }),
    [x, z, y, tempad]
  );

  const errors = useMemo(() => {
    const e = {};
    if (parsed.x === null || !Number.isFinite(parsed.x)) e.x = "X is required";
    if (parsed.z === null || !Number.isFinite(parsed.z)) e.z = "Z is required";
    if (parsed.y !== null && !Number.isFinite(parsed.y))
      e.y = "Y must be a number";
    return e;
  }, [parsed]);

  const canSave = Object.keys(errors).length === 0 && !saving;

  useEffect(() => {
    setDimension(initial?.dimension || "overworld");
    setX(initial?.x ?? "");
    setZ(initial?.z ?? "");
    setY(initial?.y ?? "");
    setTempad(initial?.tempad ?? "");
  }, [initial]);

  const submit = () => {
    if (!canSave) return;
    onSave({
      dimension,
      x: Number(parsed.x),
      z: Number(parsed.z),
      y: parsed.y === null ? null : Number(parsed.y),
      tempad: parsed.tempad,
    });
  };

  return (
    <div
      className="delete-modal-backdrop locm-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="delete-modal locm-card"
        style={{ maxWidth: 560, width: "100%" }}
      >
        {/* Header */}
        <div className="locm-header">
          <div className="locm-title">
            <MapPin size={18} />
            <h3>Shop Location</h3>
          </div>
          <button
            className="locm-icon-btn"
            aria-label="Close"
            onClick={onCancel}
            disabled={saving}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="locm-body">
          <div className="locm-row">
            <label className="locm-label" htmlFor="locm-dimension">
              Dimension
            </label>
            <select
              id="locm-dimension"
              className="companies-search form-control locm-select"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
            >
              {DIMENSIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="locm-grid">
            <div className="locm-field">
              <label className="locm-label" htmlFor="locm-x">
                X
              </label>
              <input
                id="locm-x"
                className={`companies-search form-control ${
                  errors.x ? "locm-input-error" : ""
                }`}
                placeholder="e.g. 123"
                inputMode="numeric"
                value={x}
                onChange={(e) => setX(e.target.value)}
              />
              {errors.x && <div className="locm-error">{errors.x}</div>}
            </div>

            <div className="locm-field">
              <label className="locm-label" htmlFor="locm-z">
                Z
              </label>
              <input
                id="locm-z"
                className={`companies-search form-control ${
                  errors.z ? "locm-input-error" : ""
                }`}
                placeholder="e.g. -456"
                inputMode="numeric"
                value={z}
                onChange={(e) => setZ(e.target.value)}
              />
              {errors.z && <div className="locm-error">{errors.z}</div>}
            </div>

            <div className="locm-field">
              <label className="locm-label" htmlFor="locm-y">
                Y (optional)
              </label>
              <input
                id="locm-y"
                className={`companies-search form-control ${
                  errors.y ? "locm-input-error" : ""
                }`}
                placeholder="e.g. 64"
                inputMode="numeric"
                value={y}
                onChange={(e) => setY(e.target.value)}
              />
              {errors.y && <div className="locm-error">{errors.y}</div>}
            </div>

            <div className="locm-field" style={{ gridColumn: "1 / -1" }}>
              <label className="locm-label" htmlFor="locm-tempad">
                Tempad Name (optional)
              </label>
              <input
                id="locm-tempad"
                className="companies-search form-control"
                placeholder="e.g. Main Plaza Portal"
                value={tempad}
                onChange={(e) => setTempad(e.target.value)}
              />
            </div>
          </div>

          <p className="locm-hint">
            Tip: In the Nether, <code>Overworld ≈ Nether × 8</code> (X/Z). Keep
            that in mind when sharing coords.
          </p>
        </div>

        {/* Footer */}
        <div className="delete-modal-actions locm-footer">
          {hasExisting && typeof onClear === "function" && (
            <button
              className="delete-modal-btn locm-btn-danger"
              onClick={onClear}
              disabled={saving}
              title="Remove saved location"
            >
              Remove
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="delete-modal-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={submit}
            disabled={!canSave}
            title={!canSave ? "Fill required fields" : "Save location"}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSettingsModal;
