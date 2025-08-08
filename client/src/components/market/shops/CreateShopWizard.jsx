// components/market/shops/CreateShopWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import CompanyNameInput from "../company/steps/CompanyNameInput.jsx";
import CompanyDescriptionInput from "../company/steps/CompanyDescriptionInput.jsx";
import CompanyLogoUpload from "../company/steps/CompanyLogoUpload.jsx";
import CompanyBannerUpload from "../company/steps/CompanyBannerUpload.jsx";
import CompanyGalleryUpload from "../company/steps/CompanyGalleryUpload.jsx";

import "../css/CreateCompanyWizard.css";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";

function CompanyPickerModal({ open, onClose, onPick }) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/market/my-companies?role=Founder", {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json.error || "Failed to load companies");

        const list = Array.isArray(json?.companies) ? json.companies : [];
        const eligible = list.filter((c) => (c.shop_count ?? 0) < 5);

        setCompanies(eligible);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;
  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <h2>Select a company</h2>
        {loading && <p>Loading…</p>}
        {error && <p className="upload-error">{error}</p>}
        {!loading && !error && companies.length === 0 && (
          <p>You don’t own any eligible companies yet.</p>
        )}

        <div className="company-picker-list">
          {companies.map((c) => (
            <button
              key={c.id}
              className="company-picker-item"
              onClick={() => {
                onPick(c);
                onClose();
              }}
            >
              <div className="company-picker-left">
                <img
                  src={c.logo_url || "/assets/market/default/default-logo.png"}
                  alt=""
                  width={32}
                  height={32}
                />
                <div>
                  <div className="company-name">{c.name}</div>
                  <div className="company-sub">
                    {c.short_description || "—"}
                  </div>
                </div>
              </div>
              <div className="company-picker-right">
                <span>Shops: {c.shop_count ?? 0}/5</span>
              </div>
            </button>
          ))}
        </div>

        <div className="delete-modal-actions">
          <button
            className="delete-modal-btn delete-modal-btn-cancel"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const CreateShopWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();

  const prefilledCompanyId = useMemo(
    () => parseInt(search.get("companyId") || "", 10),
    [search]
  );

  const [company, setCompany] = useState(
    location.state?.company ||
      (Number.isFinite(prefilledCompanyId) ? { id: prefilledCompanyId } : null)
  );
  const [pickerOpen, setPickerOpen] = useState(!company);

  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    logo: null,
    banner: null,
    gallery: [],
  });

  const [popup, setPopup] = useState(null);

  useEffect(() => {
    if (location.state?.form) setForm(location.state.form);
  }, [location.state]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreview = () => {
    if (!company?.id) {
      setPopup({ type: "error", message: "Please select a company first." });
      return;
    }
    if (!form.name.trim()) {
      setPopup({ type: "error", message: "Shop name is required." });
      return;
    }

    navigate("/market/create-shop/preview", { state: { form, company } });
  };

  return (
    <div className="create-company-page">
      <h1>Create a Shop</h1>

      <div className="create-form-group">
        <label>Company</label>
        <div className="company-select-row">
          <button
            className="custom-upload-button"
            onClick={() => setPickerOpen(true)}
          >
            {company?.name ? `Change (${company.name})` : "Select company"}
          </button>
          {company?.name && (
            <span className="company-chip">{company.name}</span>
          )}
        </div>
      </div>

      <CompanyNameInput
        value={form.name}
        onChange={(val) => updateField("name", val)}
      />

      <CompanyDescriptionInput
        description={form.description}
        shortDescription={form.short_description}
        onChange={(field, val) => updateField(field, val)}
      />

      <CompanyLogoUpload
        logo={form.logo}
        onChange={(file) => updateField("logo", file)}
      />
      <CompanyBannerUpload
        banner={form.banner}
        onChange={(file) => updateField("banner", file)}
      />
      <CompanyGalleryUpload
        images={form.gallery}
        onChange={(imgs) => updateField("gallery", imgs)}
      />

      <button onClick={handlePreview} className="submit-company-btn">
        Preview
      </button>

      <CompanyPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(c) => setCompany(c)}
      />

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

export default CreateShopWizard;
