import { useMarketUser } from "../../../../hooks/market/marketUserContext.js";
import { Plus, Store } from "lucide-react";
import "../../css/UserCompanies.css";

const UserShops = () => {
  const { user, loading } = useMarketUser();

  if (loading) return <p>Loading shops...</p>;
  if (!user) return <p>Error loading shops.</p>;

  const { shops } = user;

  return (
    <div className="user-companies-section">
      <div className="companies-header">
        <h2>
          <Store size={32} className="company-store-icon" />
          Your Shops
        </h2>
        <button
          className="create-company-button"
          onClick={() => alert("Shop creation coming soon...")}
        >
          <Plus className="company-plus-icon" /> Create
        </button>
      </div>

      <div className="company-cards-grid">
        {shops.length === 0 ? (
          <p>You don’t own any shops yet.</p>
        ) : (
          shops.map((shop) => (
            <div key={shop.id} className="company-card">
              <div className="company-logo-wrapper">
                <img
                  src={shop.image_urls?.[0] || "/default-shop.png"}
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
    </div>
  );
};

export default UserShops;
