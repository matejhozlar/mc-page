import { useState } from "react";
import CompanyNameInput from "./steps/CompanyNameInput.jsx";
import CompanyDescriptionInput from "./steps/CompanyDescriptionInput.jsx";
import CompanyLogoUpload from "./steps/CompanyLogoUpload.jsx";
import CompanyBannerUpload from "./steps/CompanyBannerUpload.jsx";
import CompanyGalleryUpload from "./steps/CompanyGalleryUpload.jsx";
import SubmitCompanyButton from "./steps/SubmitCompanyButton.jsx";
import "../css/CreateCompanyWizard.css";

const CreateCompanyPage = () => {
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    logo: null,
    banner: null,
    gallery: [],
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="create-company-page">
      <h1>Create a Company</h1>

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

      <SubmitCompanyButton form={form} />
    </div>
  );
};

export default CreateCompanyPage;
