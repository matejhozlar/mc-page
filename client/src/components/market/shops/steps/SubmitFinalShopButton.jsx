import { useNavigate } from "react-router-dom";
import { useState } from "react";
import StatusPopupModal from "../../../modals/StatusPopupModal";

const SubmitFinalShopButton = ({ form, companyId }) => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const body = new FormData();
    body.append("name", form.name);
    body.append("short_description", form.short_description || "");
    body.append("description", form.description || "");

    if (form.logo) body.append("logo", form.logo);
    if (form.banner) body.append("banner", form.banner);
    form.gallery
      .slice(0, 5)
      .forEach((img, i) => body.append(`gallery_${i}`, img));

    try {
      setLoading(true);
      const res = await fetch(
        `/api/market/company/${companyId}/pending-shops`,
        {
          method: "POST",
          body,
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPopup({
          type: "success",
          message: "Shop submitted! Awaiting review.",
        });
        setTimeout(() => navigate(`/market/requests`), 1200);
      } else {
        setPopup({
          type: "error",
          message: data.error || "Failed to submit shop.",
        });
      }
    } catch (err) {
      console.error(err);
      setPopup({ type: "error", message: "Unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSubmit}
        className="submit-company-btn"
        disabled={loading}
      >
        {loading ? "Submitting…" : "Submit Shop"}
      </button>

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

export default SubmitFinalShopButton;
