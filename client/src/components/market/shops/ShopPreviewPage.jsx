import { useLocation, useNavigate } from "react-router-dom";
import ShopPreview from "./ShopPreview.jsx";
import SubmitFinalShopButton from "./steps/SubmitFinalShopButton.jsx";

const ShopPreviewPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const form = state?.form;
  const company = state?.company;

  if (!form || !company?.id) {
    return (
      <div className="company-profile-page">
        <p>No preview data available.</p>
        <button onClick={() => navigate("/market/create-shop")}>Go back</button>
      </div>
    );
  }

  return (
    <div className="company-preview-page">
      <ShopPreview form={form} />

      <div className="preview-actions">
        <button
          onClick={() =>
            navigate("/market/create-shop", { state: { form, company } })
          }
          className="create-back-button"
        >
          ← Back
        </button>

        <SubmitFinalShopButton form={form} companyId={company.id} />
      </div>
    </div>
  );
};

export default ShopPreviewPage;
