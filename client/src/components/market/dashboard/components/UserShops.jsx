import { useMarketUser } from "../../../../hooks/market/marketUserContext.js";
import { Plus, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusPopupModal from "../../../modals/StatusPopupModal.jsx";
import ChooseCompanyModal from "../../company/ChooseCompanyModal.jsx";
import "../../css/UserCompanies.css";

const UserShops = () => {
  const { user, loading } = useMarketUser();
  const navigate = useNavigate();

  const [errorPopup, setErrorPopup] = useState(null);
  const [showChooser, setShowChooser] = useState(false);

  const eligibleCompanies = useMemo(() => {
    const all = Array.isArray(user?.companies) ? user.companies : [];
    const founders = all;
    return founders.filter((c) => (c.shop_count ?? 0) < 5);
  }, [user]);

  if (loading) return <p>Loading shops...</p>;
  if (!user) return <p>Error loading shops.</p>;

  const goToWizard = (companyId) => {
    navigate(`/market/create-shop?companyId=${companyId}`);
  };

  const handleCreateClick = (e) => {
    e.preventDefault();

    if (!Array.isArray(user.companies) || user.companies.length === 0) {
      setErrorPopup({
        type: "error",
        message: "You don’t own any companies yet. Create a company first.",
      });
      return;
    }

    if (eligibleCompanies.length === 0) {
      setErrorPopup({
        type: "error",
        message:
          "All your companies have reached the 5-shop limit. Remove a shop or use another company.",
      });
      return;
    }

    if (eligibleCompanies.length === 1) {
      goToWizard(eligibleCompanies[0].id);
      return;
    }

    setShowChooser(true);
  };

  const { shops } = user;

  return (
    <div className="user-companies-section">
      <div className="companies-header">
        <h2>
          <Store size={32} className="company-store-icon" />
          Your Shops
        </h2>
        <button className="create-company-button" onClick={handleCreateClick}>
          <Plus className="company-plus-icon" /> Create
        </button>
      </div>

      <div className="company-cards-grid">
        {!shops || shops.length === 0 ? (
          <p>You don’t own any shops yet.</p>
        ) : (
          shops.map((shop) => (
            <div key={shop.id} className="company-card">
              <div className="company-logo-wrapper">
                <img
                  src={
                    shop.image_urls?.[0] ||
                    "/assets/market/default/default-logo.png"
                  }
                  alt={`${shop.name} logo`}
                  className="company-logo"
                />
              </div>
              <div className="company-info">
                <h3>{shop.name}</h3>
                <p>{shop.description || "No description provided."}</p>
                <p className="small">
                  Company: {shop.company_name} •{" "}
                  {shop.is_paid ? "Paid" : "Not Paid"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {errorPopup && (
        <StatusPopupModal
          type={errorPopup.type}
          message={errorPopup.message}
          onClose={() => setErrorPopup(null)}
        />
      )}

      {showChooser && (
        <ChooseCompanyModal
          companies={eligibleCompanies}
          onCancel={() => setShowChooser(false)}
          onChoose={(companyId) => {
            setShowChooser(false);
            goToWizard(companyId);
          }}
        />
      )}
    </div>
  );
};

export default UserShops;
