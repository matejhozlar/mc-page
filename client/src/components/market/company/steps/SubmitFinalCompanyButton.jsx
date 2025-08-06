import { useNavigate } from "react-router-dom";

const SubmitFinalCompanyButton = ({ form }) => {
  const navigate = useNavigate();

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
        navigate(`/market/company/pending/${data.company_id}`);
      } else {
        alert(data.error || "Failed to submit company.");
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error occurred.");
    }
  };

  return (
    <button onClick={handleSubmit} className="submit-company-btn">
      Submit Company
    </button>
  );
};

export default SubmitFinalCompanyButton;
