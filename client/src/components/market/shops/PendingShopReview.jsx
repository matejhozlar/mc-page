// components/market/shops/admin/PendingShopReview.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import "../../css/PendingCompanyReview.css"; // reuse styles

const PendingShopReview = () => {
  const { id } = useParams(); // shop pending id
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const [shop, setShop] = useState(null);
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
        d && d.name
          ? setAdminUser(d)
          : (localStorage.clear(), (window.location.href = "/"))
      )
      .catch(() => (localStorage.clear(), (window.location.href = "/")));
  }, [allowed]);

  useEffect(() => {
    fetch(`/api/admin/pending-shops/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setShop(data))
      .catch((e) => console.error("Failed to load pending shop", e))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (shop && adminUser) {
      const msg = `Hello ${shop.owner_name},

Thanks for your shop submission.

Unfortunately, we can't approve it at this time due to the following reason:



You're welcome to revise and apply again.

Sincerely,
${adminUser.name}`;
      setReason(msg);
    }
  }, [shop, adminUser]);

  const handleApprove = async () => {
    const res = await fetch(`/api/admin/pending-shops/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setPopup({ type: "success", message: "Approved successfully!" });
      setTimeout(() => (window.location.href = "/admin"), 1200);
    } else {
      const err = await res.json().catch(() => ({}));
      setPopup({
        type: "error",
        message: `Failed to approve: ${err.error || "Unknown error"}`,
      });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setPopup({ type: "error", message: "Please provide a reason." });
      return;
    }
    const res = await fetch(`/api/admin/pending-shops/${id}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setPopup({ type: "success", message: "Rejected successfully." });
      setTimeout(() => (window.location.href = "/admin"), 1200);
    } else {
      const err = await res.json().catch(() => ({}));
      setPopup({
        type: "error",
        message: `Failed to reject: ${err.error || "Unknown error"}`,
      });
    }
  };

  if (loading) return <LoadingSpinner message="Loading shop..." />;
  if (!shop) return <p className="error">Shop not found.</p>;
  if (!checked || (allowed && !adminUser))
    return <LoadingSpinner message="Fetching data..." />;
  if (!allowed) return null;

  return (
    <>
      <div className="company-profile-page">
        <div className="company-banner">
          <img
            src={shop.logo_url || "/assets/market/default/default-logo.png"}
            alt="Shop logo"
            className="review-company-banner-logo"
          />
          <div className="company-meta">
            <h1>{shop.name}</h1>
            <p>
              Company: {shop.company_name} (#{shop.company_id})
            </p>
            <p>Submitted by: {shop.owner_name}</p>
            <p>Created: {new Date(shop.created_at).toLocaleString()}</p>
          </div>
        </div>

        {shop.banner_url && (
          <div className="review-company-banner-image">
            <img src={shop.banner_url} alt="Banner" />
          </div>
        )}

        {shop.short_description && (
          <div className="company-description-box">
            <h2>Short description</h2>
            <p>{shop.short_description}</p>
          </div>
        )}

        {shop.description && (
          <div className="company-description-box">
            <h2>Description</h2>
            <ReactMarkdown>{shop.description}</ReactMarkdown>
          </div>
        )}

        {Array.isArray(shop.gallery_urls) && shop.gallery_urls.length > 0 && (
          <div className="review-company-gallery">
            {shop.gallery_urls.map((url, i) => (
              <img key={i} src={url} alt={`Gallery ${i}`} />
            ))}
          </div>
        )}

        <div className="admin-review-form">
          <h3>Rejection Message</h3>
          <textarea
            placeholder="Write a reason for rejection..."
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

export default PendingShopReview;
