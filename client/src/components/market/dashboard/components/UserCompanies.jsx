import { useMarketUser } from "../../../../hooks/market/marketUserContext.js";
import { Plus, Briefcase } from "lucide-react";
import { NavLink } from "react-router-dom";
import "../../css/UserCompanies.css";

const UserCompanies = () => {
  const { user, loading } = useMarketUser();

  if (loading) return <p>Loading companies...</p>;
  if (!user) return <p>Error loading companies.</p>;

  const { companies, company_count, max_companies } = user;

  return (
    <div className="user-companies-section">
      <div className="companies-header">
        <h2>
          <Briefcase size={32} className="company-briefcase-icon" />
          Your Companies
        </h2>
        <NavLink
          to="/market/create-company"
          className={`create-company-button ${
            company_count >= max_companies ? "disabled" : ""
          }`}
          onClick={(e) => {
            if (company_count >= max_companies) e.preventDefault();
          }}
        >
          <Plus className="company-plus-icon" /> Create
        </NavLink>
      </div>

      <div className="company-cards-grid">
        {companies.length === 0 ? (
          <p>You don't belong to any companies yet.</p>
        ) : (
          companies.map((company) => (
            <NavLink
              to={`/market/company/${company.id}`}
              key={company.id}
              className="company-card"
            >
              <div className="company-logo-wrapper">
                <img
                  src={company.image_urls?.[0] || "/default-company.png"}
                  alt={`${company.name} logo`}
                  className="company-logo"
                />
              </div>
              <div className="company-info">
                <div className="company-header-row">
                  <h3>{company.name}</h3>
                  <p className="card-company-balance">
                    $
                    {Number(company.balance || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <p>{company.short_description || "No description provided."}</p>
                <p className="small">
                  {company.shop_count} shops • Role: {company.role}
                </p>
              </div>
            </NavLink>
          ))
        )}
      </div>
    </div>
  );
};

export default UserCompanies;
