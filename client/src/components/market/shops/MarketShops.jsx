import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import "../css/Companies.css"; // reuse the same styles

function MarketShops() {
  const [shops, setShops] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/shops/all")
      .then((res) => res.json())
      .then((data) => {
        setShops(data.shops || []);
        setFiltered(data.shops || []);
      })
      .catch((err) => console.error("❌ Failed to load shops:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...shops];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.founder_name?.toLowerCase().includes(query) ||
          s.company_name?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sort === "created")
        return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    setFiltered(result);
  }, [search, sort, shops]);

  if (loading) return <LoadingSpinner message="Loading shops..." />;

  return (
    <div className="companies-section">
      <div className="companies-header">
        <h2>All Shops</h2>
        <div className="companies-controls">
          <input
            type="text"
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="companies-search form-control"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="companies-search form-control"
          >
            <option value="created">Newest</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>

      <div className="companies-cards-grid">
        {filtered.length === 0 ? (
          <p>No shops found.</p>
        ) : (
          filtered.map((shop) => (
            <NavLink
              to={`/market/shop/${shop.id}`}
              key={shop.id}
              className="companies-card"
            >
              <div className="companies-logo-wrapper">
                <img
                  src={
                    shop.image_urls?.[0] ||
                    shop.logo_url ||
                    "/assets/market/default/default-logo.png"
                  }
                  alt={`${shop.name} logo`}
                  className="companies-logo"
                />
              </div>
              <div className="companies-info">
                <div className="companies-header-row">
                  <h3>{shop.name}</h3>
                </div>
                <p>{shop.short_description || "No description provided."}</p>
                <p className="companies-meta">
                  {shop.company_name ? (
                    <>
                      Company: <strong>{shop.company_name}</strong> •{" "}
                    </>
                  ) : null}
                  {new Date(shop.created_at).toLocaleDateString()}
                </p>
              </div>
            </NavLink>
          ))
        )}
      </div>
    </div>
  );
}

export default MarketShops;
