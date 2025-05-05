import React, { useEffect, useState } from "react";

const AdminUsersTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    fetch("/api/admin/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const handleRefresh = () => {
    if (cooldown) return;
    fetchUsers(true);

    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <h3>All Registered Users</h3>
        <button
          onClick={handleRefresh}
          disabled={cooldown}
          className="admin-refresh-button"
        >
          {cooldown ? "Please wait..." : "Refresh"}
        </button>
      </div>

      {/* Spinner overlay on refresh */}
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
        <p>Loading users...</p>
      ) : (
        <div className="admin-users-table-wrapper">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>UUID</th>
                <th>Playtime</th>
                <th>Last Seen</th>
                <th>Online</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uuid}>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="UUID">{user.uuid}</td>
                  <td data-label="Playtime">
                    {Math.floor(user.play_time_seconds / 3600)}h{" "}
                    {Math.floor((user.play_time_seconds % 3600) / 60)}m
                  </td>
                  <td data-label="Last Seen">
                    {new Date(user.last_seen).toLocaleString()}
                  </td>
                  <td data-label="Online">
                    <span
                      style={{
                        color: user.online ? "limegreen" : "gray",
                        fontWeight: "bold",
                      }}
                    >
                      {user.online ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsersTable;
