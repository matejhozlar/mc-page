import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import CompanySortDropdown from "./components/CompanySortDropdown.jsx";
import "../css/Companies.css";

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("networth");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/companies/all")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data.companies || []);
        setFiltered(data.companies || []);
      })
      .catch((err) => console.error("❌ Failed to load companies:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...companies];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.founder_name?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sort === "networth") return b.balance - a.balance;
      if (sort === "created")
        return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    setFiltered(result);
  }, [search, sort, companies]);

  if (loading) return <LoadingSpinner message="Loading companies..." />;

  return (
    <div className="companies-section">
      <div className="companies-header">
        <h2>All Companies</h2>
        <div className="companies-controls">
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="companies-search form-control"
          />
          <CompanySortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="companies-cards-grid">
        {filtered.length === 0 ? (
          <p>No companies found.</p>
        ) : (
          filtered.map((company) => (
            <NavLink
              to={`/market/company/${company.id}`}
              key={company.id}
              className="companies-card"
            >
              <div className="companies-logo-wrapper">
                <img
                  src={company.image_urls?.[0] || "/default-company.png"}
                  alt={`${company.name} logo`}
                  className="companies-logo"
                />
              </div>
              <div className="companies-info">
                <div className="companies-header-row">
                  <h3>{company.name}</h3>
                  <p className="companies-balance">
                    $
                    {Number(company.balance || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <p>{company.short_description || "No description provided."}</p>
                <p className="companies-meta">
                  Founded by <strong>{company.founder_name}</strong> •{" "}
                  {new Date(company.created_at).toLocaleDateString()}
                </p>
              </div>
            </NavLink>
          ))
        )}
      </div>
    </div>
  );
}

export default Companies;
