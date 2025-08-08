import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/AdminCompanyApproval.css";

const AdminCompanyApprovals = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const navigate = useNavigate();

  const fetchCompanies = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    fetch("/api/admin/pending-companies", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCompanies(data.companies || []))
      .catch((err) => console.error("Failed to load pending companies", err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleRefresh = () => {
    if (cooldown) return;
    fetchCompanies(true);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  return (
    <div className="admin-users-table" style={{ marginTop: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3>Pending Company Approvals</h3>
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
        <p>Loading companies...</p>
      ) : (
        <table className="responsive-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Owner</th>
              <th>Owner UUID</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", padding: "1rem" }}
                >
                  No data available.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.id}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {company.name}
                      {company.type === "edit" && (
                        <span className="admin-edit-badge">Edit</span>
                      )}
                    </div>
                  </td>
                  <td>{company.owner_name}</td>
                  <td>
                    <code style={{ fontSize: "0.8rem" }}>
                      {company.founder_uuid}
                    </code>
                  </td>
                  <td>{new Date(company.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="admin-refresh-button"
                      onClick={() =>
                        navigate(
                          company.type === "edit"
                            ? `/admin/company-edit-review/${company.id}`
                            : `/admin/company-review/${company.id}`
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

export default AdminCompanyApprovals;
