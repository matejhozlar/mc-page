import { useNavigate } from "react-router-dom";
import { useState } from "react";
import StatusPopupModal from "../../../modals/StatusPopupModal";

const SubmitFinalCompanyButton = ({ form }) => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState(null);

  const handleSubmit = async () => {
    const body = new FormData();
    body.append("name", form.name);
    body.append("short_description", form.short_description || "");
    body.append("description", form.description || "");

    if (form.logo) body.append("logo", form.logo);
    if (form.banner) body.append("banner", form.banner);
    form.gallery.forEach((img, i) => body.append(`gallery_${i}`, img));

    try {
      const res = await fetch("/api/market/pending-companies", {
        method: "POST",
        body,
      });

      const data = await res.json();

      if (res.ok) {
        setPopup({
          type: "success",
          message: "Company submitted successfully!",
        });
        setTimeout(() => navigate(`/market/requests`), 1500);
      } else {
        setPopup({
          type: "error",
          message: data.error || "Failed to submit company.",
        });
      }
    } catch (err) {
      console.error(err);
      setPopup({ type: "error", message: "Unexpected error occurred." });
    }
  };

  return (
    <>
      <button onClick={handleSubmit} className="submit-company-btn">
        Submit Company
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

export default SubmitFinalCompanyButton;
