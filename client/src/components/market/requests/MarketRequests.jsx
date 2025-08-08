import React, { useEffect, useState, useCallback } from "react";
import { useMarketUser } from "../../../hooks/market/marketUserContext.js";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import DeleteConfirmModal from "./components/DeleteConfirmModal.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import BuildProgressOverlay from "../../BuildProgressOverlay.jsx";
import "../css/MarketRequests.css";

function MarketRequests() {
  const { user, loading } = useMarketUser();
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [building, setBuilding] = useState(null);

  const fetchJsonSafe = useCallback(async (url) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);

      const reqData = await fetchJsonSafe("/api/market/requests");

      const companyEdits = await fetchJsonSafe("/api/market/company-edits");

      let shopEdits = null;
      try {
        shopEdits = await fetchJsonSafe("/api/market/shop-edits");
      } catch {
        shopEdits = null;
      }

      const list = [];

      if (reqData) {
        (reqData.pending_companies || []).forEach((r) =>
          list.push({ ...r, kind: "company", type: "new" })
        );
        (reqData.awaiting_funds_companies || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "new",
            status: "awaiting_funds",
          })
        );
        (reqData.approved_companies || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "new",
            status: "approved",
          })
        );
        (reqData.rejected_companies || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "new",
            status: "rejected",
            created_at: r.rejected_at || r.created_at,
          })
        );

        (reqData.pending_shops || []).forEach((r) =>
          list.push({ ...r, kind: "shop", type: "new" })
        );
        (reqData.awaiting_funds_shops || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "new",
            status: "awaiting_funds",
          })
        );
        (reqData.approved_shops || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "new",
            status: "approved",
          })
        );
        (reqData.rejected_shops || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "new",
            status: "rejected",
            created_at: r.rejected_at || r.created_at,
          })
        );
      }

      if (companyEdits) {
        (companyEdits.pending_edits || []).forEach((r) =>
          list.push({ ...r, kind: "company", type: "edit" })
        );
        (companyEdits.awaiting_funds_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "edit",
            status: "awaiting_funds",
          })
        );
        (companyEdits.approved_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "edit",
            status: "approved",
          })
        );
        (companyEdits.rejected_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "company",
            type: "edit",
            status: "rejected",
            created_at: r.rejected_at || r.created_at,
          })
        );
      }

      if (shopEdits) {
        (shopEdits.pending_edits || []).forEach((r) =>
          list.push({ ...r, kind: "shop", type: "edit" })
        );
        (shopEdits.awaiting_funds_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "edit",
            status: "awaiting_funds",
          })
        );
        (shopEdits.approved_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "edit",
            status: "approved",
          })
        );
        (shopEdits.rejected_edits || []).forEach((r) =>
          list.push({
            ...r,
            kind: "shop",
            type: "edit",
            status: "rejected",
            created_at: r.rejected_at || r.created_at,
          })
        );
      }

      setRequests(list);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setStatusModal({
        type: "error",
        message: "Failed to fetch your requests.",
      });
    } finally {
      setRequestsLoading(false);
    }
  }, [fetchJsonSafe]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDeleteRejected = async ({ id, type, kind }) => {
    try {
      let url;
      if (type === "edit") {
        url =
          kind === "shop"
            ? `/api/market/rejected-shop-edits/${id}`
            : `/api/market/rejected-edits/${id}`;
      } else {
        url =
          kind === "shop"
            ? `/api/market/rejected-shops/${id}`
            : `/api/market/rejected-companies/${id}`;
      }

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setRequests((prev) =>
          prev.filter(
            (r) => !(r.id === id && r.type === type && r.kind === kind)
          )
        );
        setExpandedId(null);
        setStatusModal({
          type: "success",
          message: "Request deleted successfully.",
        });
      } else {
        const error = await res.json().catch(() => ({}));
        setStatusModal({
          type: "error",
          message: "Failed to delete: " + (error.error || "Unknown error."),
        });
      }
    } catch (error) {
      console.error("❌ Failed to delete rejected request:", error);
      setStatusModal({
        type: "error",
        message: "Failed to delete the request.",
      });
    }
  };

  const handlePay = async (entry) => {
    try {
      setPayingId(entry.id);

      let url = "";
      if (entry.type === "edit") {
        url =
          entry.kind === "shop"
            ? `/api/market/shop-edits/${entry.id}/pay`
            : `/api/market/company-edits/${entry.id}/pay`;
      } else {
        url =
          entry.kind === "shop"
            ? `/api/market/pending-shops/${entry.id}/pay`
            : `/api/market/pending-companies/${entry.id}/pay`;
      }

      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setStatusModal({
          type: "error",
          message: error.error || "Payment failed.",
        });
        return;
      }

      setBuilding({ type: entry.type, kind: entry.kind });
    } catch (error) {
      console.error("❌ Pay error:", error);
      setStatusModal({ type: "error", message: "Payment failed." });
    } finally {
      setPayingId(null);
    }
  };

  const onBuildDone = async () => {
    const was = building;
    setBuilding(null);
    await fetchRequests();

    const thing =
      was?.type === "edit"
        ? `${was.kind === "shop" ? "shop" : "company"} changes`
        : `${was?.kind === "shop" ? "shop" : "company"}`;

    setStatusModal({
      type: "success",
      message:
        `All set! Your ${thing} ${
          was?.type === "edit" ? "have been applied." : "was created."
        } ` +
        (was?.type === "edit"
          ? "Changes may take up to 1 hour to take effect."
          : ""),
    });
  };

  if (loading || requestsLoading)
    return <LoadingSpinner message="Loading requests..." />;
  if (!user) return <p className="error">User not found.</p>;

  const grouped = { awaiting: [], pending: [], approved: [], rejected: [] };
  for (const req of requests) {
    if (req.status === "approved") grouped.approved.push(req);
    else if (req.status === "rejected") grouped.rejected.push(req);
    else if (req.status === "awaiting_funds") grouped.awaiting.push(req);
    else grouped.pending.push(req);
  }

  const KindBadge = ({ kind }) => (
    <span
      className={`market-kind-badge ${kind === "shop" ? "shop" : "company"}`}
      title={kind === "shop" ? "Shop request" : "Company request"}
    >
      {kind === "shop" ? "Shop" : "Company"}
    </span>
  );

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
                  <KindBadge kind={entry.kind} />
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
                    disabled={payingId === entry.id || !!building}
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
                    <KindBadge kind={entry.kind} />
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
                        disabled={!!building}
                        onClick={() =>
                          setPendingDelete({
                            id: entry.id,
                            type: entry.type,
                            kind: entry.kind,
                          })
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

      {building && (
        <BuildProgressOverlay
          type={building.type}
          durationMs={30000}
          delayMs={400}
          onDone={onBuildDone}
        />
      )}
    </div>
  );
}

export default MarketRequests;
