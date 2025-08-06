import { useLocation, useNavigate } from "react-router-dom";
import CompanyPreview from "./CompanyPreview.jsx";

const CompanyPreviewPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const form = state?.form;

  if (!form) {
    return (
      <div className="company-profile-page">
        <p>No preview data available.</p>
        <button onClick={() => navigate("/market/create-company")}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="company-preview-page">
      <CompanyPreview form={form} />
      <button
        onClick={() => navigate("/market/create-company", { state: { form } })}
        className="create-back-button"
      >
        ← Go Back & Edit
      </button>
    </div>
  );
};

export default CompanyPreviewPage;
