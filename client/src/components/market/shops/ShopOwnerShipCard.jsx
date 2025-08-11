import { Link } from "react-router-dom";
import "../css/ShopOwnerShipCard.css";

const ShopOwnershipCard = ({
  companyId,
  companyName,
  companyLogo,
  founders = [],
}) => {
  const logoSrc = companyLogo || "/assets/market/default/default-logo.png";

  return (
    <Link
      to={`/market/company/${companyId}`}
      style={{ textDecoration: "none", color: "inherit", alignItems: "center" }}
      className="companies-card ownership-card"
    >
      <div className="companies-logo-wrapper">
        <img
          src={logoSrc}
          alt="Company logo"
          className="companies-logo"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/assets/market/default/default-logo.png";
          }}
        />
      </div>

      <div className="companies-info">
        <div className="companies-header-row">
          <h3 style={{ marginBottom: 0 }}>
            <p>{companyName || `#${companyId}`}</p>
          </h3>
        </div>

        {founders.length > 0 && (
          <p
            className="companies-meta"
            style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}
          >
            Founded by{" "}
            {founders.map((f, i) => (
              <span
                key={f.uuid}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img
                  src={f.avatar_url}
                  alt={f.name}
                  width={20}
                  height={20}
                  style={{ borderRadius: "50%" }}
                />
                <strong>{f.name}</strong>
                {i < founders.length - 1 ? "," : ""}
              </span>
            ))}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ShopOwnershipCard;
