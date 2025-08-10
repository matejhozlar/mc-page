import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import "../../css/PendingCompanyReview.css";

const FieldRow = ({ label, before, after, markdown = false }) => {
  const changed = useMemo(() => {
    if (after === null || after === undefined || after === "") return false;
    return (before ?? "") !== after;
  }, [before, after]);

  return (
    <div
      className={`diff-field ${changed ? "diff-changed" : "diff-unchanged"}`}
    >
      <div className="diff-label">{label}</div>
      <div className="diff-cols">
        <div className="diff-col">
          <div className="diff-col-title">Current</div>
          <div className="diff-box">
            {markdown ? (
              <ReactMarkdown>{before || ""}</ReactMarkdown>
            ) : (
              before || <em>—</em>
            )}
          </div>
        </div>
        <div className="diff-col">
          <div className="diff-col-title">
            Proposed {changed && <span className="badge-changed">Changed</span>}
          </div>
          <div className="diff-box">
            {markdown ? (
              <ReactMarkdown>{after || ""}</ReactMarkdown>
            ) : (
              after || <em>— (no change)</em>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageRow = ({ label, beforeUrl, afterUrl }) => {
  const changed = !!afterUrl && afterUrl !== beforeUrl;
  return (
    <div
      className={`diff-field ${changed ? "diff-changed" : "diff-unchanged"}`}
    >
      <div className="diff-label">{label}</div>
      <div className="diff-cols">
        <div className="diff-col">
          <div className="diff-col-title">Current</div>
          <div className="diff-image-box">
            {beforeUrl ? (
              <img src={beforeUrl} alt={`${label} current`} />
            ) : (
              <em>—</em>
            )}
          </div>
        </div>
        <div className="diff-col">
          <div className="diff-col-title">
            Proposed {changed && <span className="badge-changed">Changed</span>}
          </div>
          <div className="diff-image-box">
            {afterUrl ? (
              <img src={afterUrl} alt={`${label} new`} />
            ) : (
              <em>— (no change)</em>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const GalleryRow = ({ before = [], after = [] }) => {
  const changed = Array.isArray(after) && after.length > 0;
  return (
    <div
      className={`diff-field ${changed ? "diff-changed" : "diff-unchanged"}`}
    >
      <div className="diff-label">Gallery</div>
      <div className="diff-cols">
        <div className="diff-col">
          <div className="diff-col-title">Current</div>
          <div className="diff-gallery">
            {(before || []).map((u, i) => (
              <img key={i} src={u} alt={`current ${i}`} />
            ))}
            {(!before || before.length === 0) && <em>—</em>}
          </div>
        </div>
        <div className="diff-col">
          <div className="diff-col-title">
            Proposed {changed && <span className="badge-changed">Changed</span>}
          </div>
          <div className="diff-gallery">
            {(after || []).map((u, i) => (
              <img key={i} src={u} alt={`proposed ${i}`} />
            ))}
            {(!after || after.length === 0) && <em>— (no change)</em>}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditShopReview = () => {
  const { editId } = useParams();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    fetch("/api/admin/validate", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        d.valid
          ? setAllowed(true)
          : (localStorage.clear(), (window.location.href = "/"))
      )
      .catch(() => (window.location.href = "/"))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        d?.name
          ? setUser(d)
          : (localStorage.clear(), (window.location.href = "/"))
      )
      .catch(() => (localStorage.clear(), (window.location.href = "/")));
  }, [allowed]);

  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetch(`/api/admin/shop-edits/${editId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setPayload)
      .catch((err) => console.error("Failed to load shop edit", err))
      .finally(() => setLoading(false));
  }, [editId]);

  useEffect(() => {
    if (!payload || !user) return;
    const recipient =
      payload?.edit?.editor_name ||
      payload?.edit?.editor_discord_id ||
      (payload?.edit?.editor_uuid
        ? payload.edit.editor_uuid.slice(0, 8)
        : "there");

    const defaultMsg = `Hello ${recipient},\n\nThanks for your shop edit submission.\n\nUnfortunately we can't approve it at this time due to:\n\n\n\nYou can revise and resubmit.\n\nSincerely,\n${user.name}`;

    setReason((prev) => (prev && prev.trim() ? prev : defaultMsg));
  }, [payload, user]);

  const handleApprove = async () => {
    const res = await fetch(`/api/admin/shop-edits/${editId}/approve`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setPopup({ type: "success", message: "Marked as awaiting funds (100)." });
      setTimeout(() => (window.location.href = "/admin"), 1200);
    } else {
      const e = await res.json().catch(() => ({}));
      setPopup({
        type: "error",
        message: `Failed to approve: ${e.error || "Unknown"}`,
      });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setPopup({ type: "error", message: "Please provide a reason." });
      return;
    }
    const res = await fetch(`/api/admin/shop-edits/${editId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setPopup({ type: "success", message: "Rejected." });
      setTimeout(() => (window.location.href = "/admin"), 1200);
    } else {
      const e = await res.json().catch(() => ({}));
      setPopup({
        type: "error",
        message: `Failed to reject: ${e.error || "Unknown"}`,
      });
    }
  };

  if (!checked || (allowed && !user))
    return <LoadingSpinner message="Fetching data..." />;
  if (!allowed) return null;
  if (loading) return <LoadingSpinner message="Loading edit..." />;
  if (!payload) return <p className="error">Edit not found.</p>;

  const { edit, original } = payload;

  return (
    <>
      <div className="company-profile-page">
        <div className="company-banner">
          <img
            src={edit.logo_path || "/assets/market/default/default-logo.png"}
            alt="Shop logo"
            className="review-company-banner-logo"
          />
          <div className="company-meta">
            <h1>
              Shop #{edit.shop_id} — Edit #{edit.id}
            </h1>
            <p>Submitted: {new Date(edit.created_at).toLocaleString()}</p>
          </div>
        </div>

        <FieldRow label="Name" before={original?.name} after={edit.name} />
        <FieldRow
          label="Short description"
          before={original?.short_description}
          after={edit.short_description}
        />
        <FieldRow
          label="Description"
          before={original?.description}
          after={edit.description}
          markdown
        />

        <ImageRow
          label="Logo"
          beforeUrl={original?.logo_url}
          afterUrl={edit.logo_path}
        />
        <ImageRow
          label="Banner"
          beforeUrl={original?.banner_url}
          afterUrl={edit.banner_path}
        />
        <GalleryRow
          before={original?.gallery_urls || []}
          after={edit.gallery_paths || []}
        />

        <div className="admin-review-form">
          <h3>Rejection Message</h3>
          <textarea
            placeholder="Write a reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="admin-review-textarea"
          />
          <div className="admin-review-buttons">
            <button onClick={handleApprove} className="admin-review-approve">
              <Check size={24} className="admin-review-shift" /> Approve
            </button>
            <button onClick={handleReject} className="admin-review-reject">
              <X size={24} className="admin-review-shift" /> Reject
            </button>
          </div>
        </div>
      </div>

      {popup && (
        <StatusPopupModal
          type={popup.type}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
};

export default EditShopReview;
