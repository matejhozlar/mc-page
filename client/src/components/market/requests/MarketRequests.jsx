// MarketRequests.jsx
import React, { useEffect, useState } from "react";
import { useMarketUser } from "../../../hooks/market/marketUserContext";
import LoadingSpinner from "../../LoadingSpinner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import "../css/MarketRequests.css";

function MarketRequests() {
  const { user, loading } = useMarketUser();
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/market/requests");
      const data = await res.json();

      const combined = [
        ...(data.pending_companies || []), // includes status: 'pending' | 'awaiting_funds' | 'approved'
        ...(data.rejected_companies || []).map((r) => ({
          ...r,
          status: "rejected",
          created_at: r.rejected_at,
        })),
      ];

      setRequests(combined);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDeleteRejected = async (id) => {
    try {
      const res = await fetch(`/api/market/rejected-companies/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setExpandedId(null);
      } else {
        const err = await res.json();
        alert("Failed to delete: " + err.error);
      }
    } catch (err) {
      console.error("❌ Failed to delete rejected request:", err);
    }
  };

  const handlePay = async (id) => {
    try {
      setPayingId(id);
      const res = await fetch(`/api/market/pending-companies/${id}/pay`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return alert(err.error || "Payment failed.");
      }
      // refresh after successful payment
      await fetchRequests();
    } catch (e) {
      console.error("❌ Pay error:", e);
      alert("Payment failed.");
    } finally {
      setPayingId(null);
    }
  };

  if (loading || requestsLoading)
    return <LoadingSpinner message="Loading requests..." />;
  if (!user) return <p className="error">User not found.</p>;

  const grouped = {
    awaiting: [],
    pending: [],
    approved: [],
    rejected: [],
  };

  for (const req of requests) {
    if (req.status === "approved") grouped.approved.push(req);
    else if (req.status === "rejected") grouped.rejected.push(req);
    else if (req.status === "awaiting_funds") grouped.awaiting.push(req);
    else grouped.pending.push(req); // 'pending'
  }

  const renderAwaiting = (entries) => (
    <div className="market-request-section">
      <h3 className="market-request-awaiting">Awaiting Payment</h3>
      {entries.length === 0 ? (
        <p className="market-empty">No awaiting payments</p>
      ) : (
        <ul className="market-request-list">
          {entries.map((entry) => (
            <li key={entry.id} className="market-awaiting-item">
              <div className="market-request-top">
                <div className="market-request-left">
                  <strong>{entry.name}</strong>
                  <span className="market-request-meta">#{entry.id}</span>
                </div>

                <div className="market-request-right">
                  <span className="market-pay-amount">
                    Requires&nbsp;$
                    {Number(entry.fee_required || 0).toLocaleString()}
                  </span>
                  <button
                    className="market-pay-btn"
                    disabled={payingId === entry.id}
                    onClick={() => handlePay(entry.id)}
                  >
                    {payingId === entry.id ? "Processing..." : "Pay"}
                  </button>
                </div>
              </div>

              <div className="market-awaiting-footnote">
                Submitted:&nbsp;
                {new Date(entry.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderSection = (title, entries) => (
    <div className="market-request-section">
      <h3
        className={
          title === "Approved"
            ? "market-request-approved"
            : title === "Rejected"
            ? "market-request-rejected"
            : ""
        }
      >
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="market-empty">No requests</p>
      ) : (
        <ul className="market-request-list">
          {entries.map((entry) => {
            const isRejected = entry.status === "rejected";
            const isExpanded = expandedId === entry.id;

            return (
              <li key={entry.id} className="market-request-item">
                <div className="market-request-top">
                  <div className="market-request-left">
                    <strong>{entry.name}</strong>
                    <span className="market-request-meta">#{entry.id}</span>
                  </div>

                  <div className="market-request-right">
                    <span className="market-request-date">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {isRejected && (
                      <button
                        className="market-expand-btn"
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === entry.id ? null : entry.id
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isRejected && isExpanded && (
                    <Motion.div
                      key="expanded"
                      className="market-rejection-expanded"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p className="market-rejection-label">
                        Rejection Reason:
                      </p>
                      <div className="market-rejection-box">{entry.reason}</div>
                      <button
                        className="market-delete-btn"
                        onClick={() => setPendingDeleteId(entry.id)}
                      >
                        Delete Request
                      </button>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
      {pendingDeleteId && (
        <DeleteConfirmModal
          onConfirm={() => {
            handleDeleteRejected(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );

  return (
    <div className="market-requests-page">
      <h2>My Requests</h2>
      {renderAwaiting(grouped.awaiting)}
      {renderSection("Pending", grouped.pending)}
      {renderSection("Approved", grouped.approved)}
      {renderSection("Rejected", grouped.rejected)}
    </div>
  );
}

export default MarketRequests;
