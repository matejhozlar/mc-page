import React, { useEffect, useState } from "react";
import "../market/css/DeleteConfirmModal.css";

const ItemFormModal = ({
  title = "Item",
  initial = {
    name: "",
    price: "",
    stock: "",
    sku: "",
    description: "",
    category_ids: [],
  },
  categories = [],
  onSave,
  onCancel,
  saving = false,
  onQuickAddCategory,
  canCreateCategories = false,
}) => {
  const [form, setForm] = useState(initial);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    setForm(initial || {});
  }, [initial]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleCat = (id) => {
    setForm((p) => {
      const set = new Set(p.category_ids || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, category_ids: Array.from(set) };
    });
  };

  return (
    <div className="delete-modal-backdrop" role="dialog" aria-modal="true">
      <div className="delete-modal" style={{ maxWidth: 560, width: "100%" }}>
        <h3>{title}</h3>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="companies-search form-control"
            placeholder="Name"
            value={form.name || ""}
            onChange={(e) => update("name", e.target.value)}
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <input
              className="companies-search form-control"
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ""}
              onChange={(e) => update("price", e.target.value)}
            />
            <input
              className="companies-search form-control"
              placeholder="Stock"
              type="number"
              min="0"
              step="1"
              value={form.stock ?? ""}
              onChange={(e) => update("stock", e.target.value)}
            />
          </div>
          <input
            className="companies-search form-control"
            placeholder="SKU"
            value={form.sku || ""}
            onChange={(e) => update("sku", e.target.value)}
          />
          <textarea
            className="companies-search form-control"
            placeholder="Description"
            rows={3}
            value={form.description || ""}
            onChange={(e) => update("description", e.target.value)}
          />

          {/* Categories */}
          <div style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>Categories</div>

            {/* list (only when there are categories) */}
            {categories.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map((c) => {
                  const checked = (form.category_ids || []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(c.id)}
                      />
                      <span>{c.name}</span>
                      {!c.shop_id && (
                        <em style={{ opacity: 0.6, marginLeft: 4 }}>
                          (global)
                        </em>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p style={{ opacity: 0.7, margin: "4px 0 0" }}>
                No categories yet.
              </p>
            )}

            {/* quick add — ALWAYS visible for founders */}
            {canCreateCategories &&
              typeof onQuickAddCategory === "function" && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="companies-search form-control"
                    placeholder="New category…"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  />
                  <button
                    className="delete-modal-btn delete-modal-btn-confirm"
                    onClick={async () => {
                      const name = newCat.trim();
                      if (!name) return;
                      const created = await onQuickAddCategory(name);
                      if (created?.id) {
                        setForm((p) => ({
                          ...p,
                          category_ids: [...(p.category_ids || []), created.id],
                        }));
                        setNewCat("");
                      }
                    }}
                    disabled={saving}
                  >
                    Add
                  </button>
                </div>
              )}
          </div>
        </div>

        <div className="delete-modal-actions" style={{ marginTop: 12 }}>
          <button
            className="delete-modal-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={() => onSave(form)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemFormModal;
