import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import LoadingSpinner from "../LoadingSpinner.jsx";
import "./css/Companies.css";

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function Marketplace() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 300);

  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const limit = 10;
  const offsetRef = useRef(0);

  const fetchPage = async ({ append = false } = {}) => {
    const params = new URLSearchParams({
      query: debouncedQ,
      limit: String(limit),
      offset: String(offsetRef.current),
    });
    const res = await fetch(`/api/market/items/search?` + params.toString());
    if (!res.ok) throw new Error("Failed to load items");
    const data = await res.json();
    const nextItems = append ? [...items, ...data.items] : data.items;
    setItems(nextItems);
    setHasMore(!!data.has_more);
    if (typeof data.total === "number") setTotal(data.total);
  };

  const initialLoad = async () => {
    setLoading(true);
    offsetRef.current = 0;
    try {
      await fetchPage({ append: false });
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    offsetRef.current += limit;
    try {
      await fetchPage({ append: true });
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // initial + whenever query changes
  useEffect(() => {
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const resultsMeta = useMemo(() => {
    if (typeof total === "number") {
      return `${Math.min(items.length, total)} of ${total}`;
    }
    return `${items.length}${hasMore ? "+" : ""}`;
  }, [items.length, total, hasMore]);

  return (
    <div className="companies-section">
      <div className="companies-header">
        <h2>Marketplace</h2>
        <div className="companies-controls">
          <input
            type="text"
            className="companies-search form-control"
            placeholder="Search items (e.g., netherite pickaxe)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="companies-meta">Showing {resultsMeta}</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading items..." />
      ) : (
        <>
          <div className="companies-cards-grid">
            {items.length === 0 ? (
              <p>No items found.</p>
            ) : (
              items.map((it) => (
                <NavLink
                  to={`/market/shop/${it.shop_id}`}
                  key={`${it.id}-${it.shop_id}`}
                  className="companies-card"
                  title={`Open ${it.shop_name}`}
                >
                  <div className="companies-logo-wrapper">
                    <img
                      src={
                        it.shop_logo ||
                        "/assets/market/default/default-logo.png"
                      }
                      alt={`${it.shop_name} logo`}
                      className="companies-logo"
                    />
                  </div>
                  <div className="companies-info" style={{ flex: 1 }}>
                    <div
                      className="companies-header-row"
                      style={{ justifyContent: "space-between" }}
                    >
                      <h3>{it.item_name}</h3>
                      <p className="companies-balance">
                        {it.currency === "$" ? "$" : it.currency || "$"}
                        {Number(it.price || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <p className="companies-meta">
                      Sold by <strong>{it.shop_name}</strong>
                    </p>
                  </div>
                </NavLink>
              ))
            )}
          </div>

          {hasMore && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "1rem",
              }}
            >
              <button
                className="companies-custom-dropdown-button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{ width: "12rem", textAlign: "center" }}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
