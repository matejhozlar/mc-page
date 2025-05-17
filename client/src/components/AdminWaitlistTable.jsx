import React, { useEffect, useState } from "react";

// utils
import { useAdminConsole } from "./utils/AdminConsoleContext";

const AdminWaitlistTable = () => {
  const [entries, setEntries] = useState([]);
  const [sending, setSending] = useState({});
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { appendLog } = useAdminConsole();

  const fetchWaitlist = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    fetch("/api/admin/waitlist", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setEntries(data.entries || []))
      .catch((err) => console.error("Failed to fetch waitlist:", err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const sendInvite = async (id) => {
    setSending((prev) => ({ ...prev, [id]: true }));
    try {
      appendLog({ text: `⏳ Sending invite to ID ${id}...`, time: Date.now() });
      const res = await fetch("/api/admin/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        appendLog({
          text: `❌ Failed to send invite: ${data.error}`,
          time: Date.now(),
        });
        throw new Error(data.error || "Unknown error");
      }

      appendLog({
        text: `✅ Invite sent to ${data.email || "user"}`,
        time: Date.now(),
      });
    } catch (error) {
      appendLog({
        text: `❌ Error sending invite: ${error.message}`,
        time: Date.now(),
      });
    } finally {
      setSending((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRefresh = () => {
    if (cooldown) return;
    fetchWaitlist(true);

    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

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
        <h3>Waitlist Invitations</h3>
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
        <p>Loading waitlist...</p>
      ) : (
        <table className="responsive-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Discord</th>
              <th>Token</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", padding: "1rem" }}
                >
                  No data available.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.email}</td>
                  <td>{entry.discord_name}</td>
                  <td>{entry.token || <em>None</em>}</td>
                  <td>{new Date(entry.submitted_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={async () => {
                        await sendInvite(entry.id);
                        handleRefresh();
                      }}
                      disabled={!!entry.token || sending[entry.id]}
                      className="admin-refresh-button"
                    >
                      {entry.token
                        ? "Invited!"
                        : sending[entry.id]
                        ? "Sending..."
                        : "Send Email"}
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

export default AdminWaitlistTable;
