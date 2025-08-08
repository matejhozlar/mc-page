import React, { useEffect, useState } from "react";
import { useMarketUser } from "../../../hooks/market/marketUserContext";
import LoadingSpinner from "../../LoadingSpinner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import StatusPopupModal from "../../modals/StatusPopupModal";
import "../css/MarketRequests.css";

function MarketRequests() {
  const { user, loading } = useMarketUser();
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // {type, message}

  const fetchRequests = async () => {
    try {
      const [reqRes, editsRes] = await Promise.all([
        fetch("/api/market/requests"),
        fetch("/api/market/company-edits"),
      ]);

      const reqData = await reqRes.json();
      const editsData = await editsRes.json();

      const combined = [
        ...(reqData.pending_companies || []).map((r) => ({
          ...r,
          type: "new",
        })),
        ...(reqData.rejected_companies || []).map((r) => ({
          ...r,
          type: "new",
          status: "rejected",
          created_at: r.rejected_at,
        })),
        ...(editsData.pending_edits || []),
        ...(editsData.awaiting_funds_edits || []),
        ...(editsData.rejected_edits || []),
      ];

      setRequests(combined);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
      setStatusModal({
        type: "error",
        message: "Failed to fetch your requests.",
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDeleteRejected = async ({ id, type }) => {
    try {
      const url =
        type === "edit"
          ? `/api/market/rejected-edits/${id}`
          : `/api/market/rejected-companies/${id}`;

      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        setRequests((prev) =>
          prev.filter((r) => !(r.id === id && r.type === type))
        );
        setExpandedId(null);
        setStatusModal({
          type: "success",
          message: "Request deleted successfully.",
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusModal({
          type: "error",
          message: "Failed to delete: " + (err.error || "Unknown error."),
        });
      }
    } catch (err) {
      console.error("❌ Failed to delete rejected request:", err);
      setStatusModal({
        type: "error",
        message: "Failed to delete the request.",
      });
    }
  };

  const handlePay = async (entry) => {
    try {
      setPayingId(entry.id);
      const url =
        entry.type === "edit"
          ? `/api/market/company-edits/${entry.id}/pay`
          : `/api/market/pending-companies/${entry.id}/pay`;

      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatusModal({
          type: "error",
          message: err.error || "Payment failed.",
        });
        return;
      }
      await fetchRequests();
      setStatusModal({
        type: "success",
        message: "Payment completed successfully.",
      });
    } catch (e) {
      console.error("❌ Pay error:", e);
      setStatusModal({
        type: "error",
        message: "Payment failed.",
      });
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
    else grouped.pending.push(req);
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
                  {entry.type === "edit" && (
                    <span className="market-edit-badge">Edit</span>
                  )}
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
                    onClick={() => handlePay(entry)}
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
                    {entry.type === "edit" && (
                      <span className="market-edit-badge">Edit</span>
                    )}
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
                        onClick={() =>
                          setPendingDelete({ id: entry.id, type: entry.type })
                        }
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
      {pendingDelete && (
        <DeleteConfirmModal
          onConfirm={() => {
            handleDeleteRejected(pendingDelete);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
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

      {statusModal && (
        <StatusPopupModal
          type={statusModal.type}
          message={statusModal.message}
          onClose={() => setStatusModal(null)}
        />
      )}
    </div>
  );
}

export default MarketRequests;
