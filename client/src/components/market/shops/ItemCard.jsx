import React from "react";

const ItemCard = ({
  item,
  categories,
  busy,
  canManage,
  onEdit,
  onToggleVisibility,
  onDelete,
}) => {
  const price = Number(item.price || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const catMap = React.useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const chips = (item.category_ids || [])
    .map((id) => catMap.get(id))
    .filter(Boolean);

  return (
    <div className="companies-card" style={{ cursor: "default" }}>
      <div className="companies-info">
        <div className="companies-header-row">
          <h3>{item.name}</h3>
          <p className="companies-balance">${price}</p>
        </div>

        {chips.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: "6px 0",
            }}
          >
            {chips.map((label, i) => (
              <span
                key={i}
                className="admin-edit-badge"
                style={{ opacity: 0.9 }}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {item.description && <p>{item.description}</p>}

        <p className="companies-meta">
          Stock: <strong>{item.stock}</strong> •{" "}
          {new Date(item.created_at).toLocaleDateString()}
          {item.status && item.status !== "active" ? ` • ${item.status}` : ""}
          {item.sku ? ` • SKU: ${item.sku}` : ""}
        </p>

        {canManage && (
          <div
            style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}
          >
            <button
              className="shop-page-button"
              onClick={onEdit}
              disabled={busy}
            >
              {busy ? "Saving..." : "Edit"}
            </button>
            <button
              className="shop-page-button"
              onClick={onToggleVisibility}
              disabled={busy}
            >
              {busy ? "Saving..." : item.status === "hidden" ? "Show" : "Hide"}
            </button>
            <button
              className="shop-page-button"
              onClick={onDelete}
              disabled={busy}
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
