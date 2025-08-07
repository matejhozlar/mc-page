import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import "../../css/PendingCompanyReview.css";

const PendingCompanyReview = () => {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    fetch("/api/admin/validate", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setAllowed(true);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => {
        setChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch("/api/admin/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setUser(data);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        localStorage.clear();
        window.location.href = "/";
      });
  }, [allowed]);

  useEffect(() => {
    fetch(`/api/admin/pending-companies/${companyId}`)
      .then((res) => res.json())
      .then((data) => setCompany(data))
      .catch((err) => console.error("Failed to load pending company", err))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (company && user) {
      const defaultMessage = `Hello ${company.owner_name},\n\nThank you for your submission to the server's company registry.\n\nUnfortunately, we are unable to approve your request at this time due to the following reason:\n\n\n\nYou're welcome to revise your submission and apply again.\n\nSincerely,\n${user.name}`;
      setReason(defaultMessage);
    }
  }, [company, user]);

  const handleApprove = async () => {
    const res = await fetch(
      `/api/admin/pending-companies/${companyId}/approve`,
      {
        method: "POST",
      }
    );

    if (res.ok) {
      setPopup({ type: "success", message: "Approved successfully!" });
      setTimeout(() => (window.location.href = "/admin"), 1500);
    } else {
      const error = await res.json();
      setPopup({ type: "error", message: `Failed to approve: ${error.error}` });
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setPopup({ type: "error", message: "Please provide a reason." });
      return;
    }

    const res = await fetch(
      `/api/admin/pending-companies/${companyId}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
    );

    if (res.ok) {
      setPopup({ type: "success", message: "Rejected successfully." });
      setTimeout(() => (window.location.href = "/admin"), 1500);
    } else {
      const err = await res.json();
      setPopup({ type: "error", message: `Failed to reject: ${err.error}` });
    }
  };

  if (loading) return <LoadingSpinner message="Loading company..." />;
  if (!company) return <p className="error">Company not found.</p>;
  if (!checked || (allowed && !user))
    return <LoadingSpinner message="Fetching data..." />;
  if (!allowed) return null;

  return (
    <>
      <div className="company-profile-page">
        <div className="company-banner">
          <img
            src={company.logo_url || "/assets/market/default/default-logo.png"}
            alt="Company logo"
            className="review-company-banner-logo"
          />
          <div className="company-meta">
            <h1>{company.name}</h1>
            <p>Submitted by: {company.owner_name}</p>
            <p>Created: {new Date(company.created_at).toLocaleString()}</p>
          </div>
        </div>

        {company.banner_url && (
          <div className="review-company-banner-image">
            <img src={company.banner_url} alt="Banner" />
          </div>
        )}

        <div className="company-description-box">
          <h2>Description</h2>
          <ReactMarkdown>{company.description}</ReactMarkdown>
        </div>

        {company.gallery_urls && company.gallery_urls.length > 0 && (
          <div className="review-company-gallery">
            {company.gallery_urls.map((url, i) => (
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

export default PendingCompanyReview;
