import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CompanyNameInput from "./steps/CompanyNameInput.jsx";
import CompanyDescriptionInput from "./steps/CompanyDescriptionInput.jsx";
import CompanyLogoUpload from "./steps/CompanyLogoUpload.jsx";
import CompanyBannerUpload from "./steps/CompanyBannerUpload.jsx";
import CompanyGalleryUpload from "./steps/CompanyGalleryUpload.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import LoadingSpinner from "../../LoadingSpinner.jsx";

import "../css/CreateCompanyWizard.css";

const EditCompanyWizard = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [visitor, setVisitor] = useState(null);
  const [company, setCompany] = useState(null);
  const [popup, setPopup] = useState(null);

  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    logo: null,
    banner: null,
    gallery: [],
  });

  const isFounder = useMemo(() => {
    if (!visitor || !company) return false;
    return (
      visitor?.companies?.some(
        (c) => c.id === company.id && c.role === "Founder"
      ) ?? false
    );
  }, [visitor, company]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [companyRes, meRes] = await Promise.all([
          fetch(`/api/market/company/${companyId}`),
          fetch("/api/market/me", { credentials: "include" }),
        ]);

        if (!companyRes.ok) throw new Error("Failed to load company");
        const companyData = await companyRes.json();

        const meData = meRes.ok ? await meRes.json() : null;

        if (cancelled) return;
        setCompany(companyData);
        setVisitor(meData);

        setForm((prev) => ({
          ...prev,
          name: companyData.name || "",
          short_description: companyData.short_description || "",
          description: companyData.description || "",
          logo: null,
          banner: null,
          gallery: [],
        }));
      } catch (e) {
        console.error(e);
        setPopup({ type: "error", message: "Failed to load company." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!loading && visitor && company && !isFounder) {
      setPopup({
        type: "error",
        message: "You don’t have permission to edit this company.",
      });
      setTimeout(() => navigate(`/market/company/${companyId}`), 1500);
    }
  }, [loading, visitor, company, isFounder, navigate, companyId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const body = new FormData();
    body.append("name", form.name || "");
    body.append("short_description", form.short_description || "");
    body.append("description", form.description || "");

    if (form.logo) body.append("logo", form.logo);
    if (form.banner) body.append("banner", form.banner);
    form.gallery.forEach((file, i) => body.append(`gallery_${i}`, file));

    try {
      const res = await fetch(`/api/market/company/${companyId}/edits`, {
        method: "POST",
        body,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPopup({ type: "success", message: "Submited!" });
        setTimeout(() => navigate(`/market/requests`), 1000);
      } else {
        setPopup({
          type: "error",
          message: data?.error || "Unable to update company.",
        });
      }
    } catch (err) {
      console.error(err);
      setPopup({ type: "error", message: "Unexpected error occurred." });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }
  if (!company || !visitor) {
    return (
      <div className="create-company-page">
        <h1>Not found</h1>
      </div>
    );
  }

  return (
    <div className="create-company-page">
      <h1>Edit Company</h1>

      {/* Name / Descriptions (prefilled) */}
      <CompanyNameInput
        value={form.name}
        onChange={(val) => updateField("name", val)}
      />
      <CompanyDescriptionInput
        description={form.description}
        shortDescription={form.short_description}
        onChange={(field, val) => updateField(field, val)}
      />

      {/* Current vs New Logo */}
      <div className="create-section">
        <h3 className="create-section-title">Current Logo</h3>
        <img
          src={company.logo_url || "/assets/market/default/default-logo.png"}
          alt="Current logo"
          style={{ maxHeight: 96, borderRadius: 8, marginBottom: 8 }}
        />
        <CompanyLogoUpload
          logo={form.logo}
          onChange={(file) => updateField("logo", file)}
        />
      </div>

      {/* Current vs New Banner */}
      <div className="create-section">
        <h3 className="create-section-title">Current Banner</h3>
        {company.banner_url ? (
          <img
            src={company.banner_url}
            alt="Current banner"
            style={{ width: "100%", borderRadius: 8, marginBottom: 8 }}
          />
        ) : (
          <p className="muted">No banner set</p>
        )}
        <CompanyBannerUpload
          banner={form.banner}
          onChange={(file) => updateField("banner", file)}
        />
      </div>

      {/* Current vs New Gallery */}
      <div className="create-section">
        <h3 className="create-section-title">Current Gallery</h3>
        {company.gallery_urls && company.gallery_urls.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {company.gallery_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Gallery ${i}`}
                style={{ width: "100%", borderRadius: 8 }}
              />
            ))}
          </div>
        ) : (
          <p className="muted">No gallery images</p>
        )}
        <CompanyGalleryUpload
          images={form.gallery}
          onChange={(imgs) => updateField("gallery", imgs)}
        />
        <p className="muted" style={{ marginTop: 6 }}>
          Tip: if you upload new gallery files, they will replace the existing
          gallery (server-enforced).
        </p>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="create-submit-button" onClick={handleSubmit}>
          Submit
        </button>
        <button
          className="create-back-button"
          onClick={() => navigate(`/market/company/${companyId}`)}
        >
          Cancel
        </button>
      </div>

      {popup && (
        <StatusPopupModal
          type={popup.type}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default EditCompanyWizard;
