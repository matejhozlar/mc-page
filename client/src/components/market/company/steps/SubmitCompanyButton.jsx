import { useNavigate } from "react-router-dom";

const SubmitCompanyButton = ({ form }) => {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Company name is required.");
      return;
    }

    const body = new FormData();
    body.append("name", form.name);
    body.append("short_description", form.short_description || "");
    body.append("description", form.description || "");
    if (form.logo) body.append("logo", form.logo);
    if (form.banner) body.append("banner", form.banner);
    form.gallery.forEach((img, i) => body.append(`gallery_${i}`, img));

    try {
      const res = await fetch("/api/market/companies", {
        method: "POST",
        body,
      });

      const data = await res.json();

      if (res.ok) {
        navigate(`/market/company/${data.id}`);
      } else {
        alert(data.error || "Failed to create company.");
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error.");
    }
  };

  return (
    <button onClick={handleSubmit} className="submit-company-btn">
      Create Company
    </button>
  );
};

export default SubmitCompanyButton;
