import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CompanyNameInput from "../company/steps/CompanyNameInput.jsx";
import CompanyDescriptionInput from "../company/steps/CompanyDescriptionInput.jsx";
import CompanyLogoUpload from "../company/steps/CompanyLogoUpload.jsx";
import CompanyBannerUpload from "../company/steps/CompanyBannerUpload.jsx";
import CompanyGalleryUpload from "../company/steps/CompanyGalleryUpload.jsx";

import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import "../css/CreateCompanyWizard.css";

const EditShopWizard = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [visitor, setVisitor] = useState(null);
  const [shop, setShop] = useState(null);
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
    if (!visitor || !shop) return false;
    return (
      visitor?.companies?.some(
        (c) => c.id === shop.company_id && c.role === "Founder"
      ) ?? false
    );
  }, [visitor, shop]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shopRes, meRes] = await Promise.all([
          fetch(`/api/market/shop/${shopId}`),
          fetch("/api/market/me", { credentials: "include" }),
        ]);

        if (!shopRes.ok) throw new Error("Failed to load shop");
        const shopData = await shopRes.json();

        const meData = meRes.ok ? await meRes.json() : null;

        if (cancelled) return;
        setShop(shopData);
        setVisitor(meData);

        setForm((prev) => ({
          ...prev,
          name: shopData.name || "",
          short_description: shopData.short_description || "",
          description: shopData.description || "",
          logo: null,
          banner: null,
          gallery: [],
        }));
      } catch (e) {
        console.error(e);
        setPopup({ type: "error", message: "Failed to load shop." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  useEffect(() => {
    if (!loading && visitor && shop && !isFounder) {
      setPopup({
        type: "error",
        message: "You don’t have permission to edit this shop.",
      });
      setTimeout(() => navigate(`/market/shop/${shopId}`), 1500);
    }
  }, [loading, visitor, shop, isFounder, navigate, shopId]);

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
      const res = await fetch(`/api/market/shop/${shopId}/edits`, {
        method: "POST",
        body,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setPopup({ type: "success", message: "Submitted!" });
        setTimeout(() => navigate(`/market/requests`), 1000);
      } else {
        setPopup({
          type: "error",
          message: data?.error || "Unable to submit edit.",
        });
      }
    } catch (err) {
      console.error(err);
      setPopup({ type: "error", message: "Unexpected error occurred." });
    }
  };

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!shop || !visitor)
    return (
      <div className="create-company-page">
        <h1>Not found</h1>
      </div>
    );

  return (
    <div className="create-company-page">
      <h1>Edit Shop</h1>

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
          src={shop.logo_url || "/assets/market/default/default-logo.png"}
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
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
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
        {shop.gallery_urls && shop.gallery_urls.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {shop.gallery_urls.map((url, i) => (
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
          onClick={() => navigate(`/market/shop/${shopId}`)}
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

export default EditShopWizard;
