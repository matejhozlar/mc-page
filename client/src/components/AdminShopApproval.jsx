import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/AdminCompanyApproval.css";

const AdminShopApproval = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const navigate = useNavigate();

  const fetchShops = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    fetch("/api/admin/pending-shops", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setShops(data.shops || []))
      .catch((error) => console.error("Failed to load pending shops", error))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleRefresh = () => {
    if (cooldown) return;
    fetchShops(true);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  return (
    <div
      className="admin-users-table"
      style={{ marginTop: "2rem", position: "relative" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3>Pending Shop Approvals</h3>
        <button
          onClick={handleRefresh}
          disabled={cooldown}
          className="admin-refresh-button"
        >
          {cooldown ? "Please wait..." : "Refresh"}
        </button>
      </div>

      {refreshing && (
        <div
          style={{
            position: "absolute",
            top: "3.5rem",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "8px",
            zIndex: 5,
          }}
        >
          <div className="loading-cog" />
        </div>
      )}

      {loading ? (
        <p>Loading shops...</p>
      ) : (
        <table className="responsive-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Company</th>
              <th>Owner</th>
              <th>Owner UUID</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shops.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "1rem" }}
                >
                  No data available.
                </td>
              </tr>
            ) : (
              shops.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {s.name}
                      {s.type === "edit" && (
                        <span className="admin-edit-badge">Edit</span>
                      )}
                    </div>
                  </td>
                  <td>{s.company_name || `#${s.company_id}`}</td>
                  <td>{s.owner_name}</td>
                  <td>
                    <code style={{ fontSize: "0.8rem" }}>{s.founder_uuid}</code>
                  </td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="admin-refresh-button"
                      onClick={() =>
                        navigate(
                          s.type === "edit"
                            ? `/admin/shop-edit-review/${s.id}`
                            : `/admin/shop-review/${s.id}`
                        )
                      }
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminShopApproval;
