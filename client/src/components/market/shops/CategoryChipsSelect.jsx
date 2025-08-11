import React, { useMemo } from "react";
import "../css/CategoryChips.css";

const CategoryChipsSelect = ({
  categories = [],
  value = [],
  onChange,
  allowCreate = false,
  onCreate,
  createPlaceholder = "New category…",
  showActions = true,
  compact = false,
  disabled = false,
  title = "Categories",
}) => {
  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange?.(Array.from(next));
  };

  const clearAll = () => onChange?.([]);
  const selectAll = () => onChange?.(categories.map((c) => c.id));

  let inputRef;
  const handleCreate = async () => {
    if (!allowCreate || !onCreate) return;
    const name = (inputRef?.value || "").trim();
    if (!name) return;
    const created = await onCreate(name);
    if (created?.id) {
      onChange?.([...(value || []), created.id]);
      if (inputRef) inputRef.value = "";
    }
  };

  return (
    <div className={`catchips ${compact ? "catchips-compact" : ""}`}>
      <div className="catchips-header">
        <span className="catchips-title">{title}</span>
        {showActions && categories.length > 0 && (
          <div className="catchips-actions">
            <button
              type="button"
              className="catchips-action"
              onClick={clearAll}
              disabled={disabled || value.length === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="catchips-action"
              onClick={selectAll}
              disabled={
                disabled ||
                value.length === categories.length ||
                categories.length === 0
              }
            >
              Select all
            </button>
          </div>
        )}
      </div>

      <div className="catchips-list" role="group" aria-label={title}>
        {categories.length === 0 ? (
          <span className="catchips-empty">No categories yet.</span>
        ) : (
          categories.map((c) => {
            const isSel = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`catchip ${isSel ? "selected" : ""}`}
                onClick={() => toggle(c.id)}
                aria-pressed={isSel}
                role="checkbox"
                aria-checked={isSel}
                title={!c.shop_id ? `${c.name} (global)` : c.name}
              >
                {c.name}
                {!c.shop_id && <span className="catchip-tag">global</span>}
              </button>
            );
          })
        )}
      </div>

      {allowCreate && onCreate && (
        <div className="catchips-create">
          <input
            ref={(r) => (inputRef = r)}
            className="catchips-input"
            placeholder={createPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <button
            type="button"
            className="catchips-create-btn"
            onClick={handleCreate}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryChipsSelect;
