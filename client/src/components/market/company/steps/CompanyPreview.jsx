import ReactMarkdown from "react-markdown";
import { useMemo } from "react";
import CompanyBalanceChart from "../components/CompanyBalanceChart.jsx";

const CompanyPreview = ({ form }) => {
  const balanceHistory = useMemo(() => {
    const base = 10000;
    let last = base;
    const history = Array.from({ length: 7 }, (_, i) => {
      const change = (Math.random() - 0.5) * 500;
      last += change;
      return {
        recorded_at: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
        balance: Math.max(0, last.toFixed(2)),
      };
    });
    return history;
  }, []);

  const mockBalance =
    balanceHistory.length > 0
      ? balanceHistory[balanceHistory.length - 1].balance
      : 0;

  return (
    <>
      {/* Header */}
      <div className="company-banner">
        <div className="company-banner-left">
          <img
            src={
              form.logo
                ? URL.createObjectURL(form.logo)
                : "/assets/market/default/default-logo.png"
            }
            alt="Logo"
            className="company-banner-logo"
          />
          <div className="company-meta">
            <h1>{form.name || "Company Name"}</h1>
            <p>{form.short_description || "Preview"}</p>
          </div>
        </div>
        {/* Balance */}
        <div className="company-balance">
          <p>
            $
            {Number(mockBalance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Banner */}
      {form.banner && (
        <div className="company-banner-image">
          <img
            src={URL.createObjectURL(form.banner)}
            alt="Banner"
            className="company-banner-img"
          />
        </div>
      )}

      {/* Description */}
      {form.description && (
        <div className="company-description-box">
          <h2 className="company-section-title">Description</h2>
          <ReactMarkdown>{form.description}</ReactMarkdown>
        </div>
      )}

      {/* Net Worth Chart */}
      {balanceHistory.length > 0 && (
        <CompanyBalanceChart history={balanceHistory} />
      )}

      {/* Gallery */}
      {form.gallery.length > 0 && (
        <div className="company-gallery">
          <h2 className="company-section-title">Gallery</h2>
          <div className="gallery-carousel">
            {form.gallery.map((img, index) => (
              <div key={index} className="gallery-image-wrapper">
                <img
                  src={URL.createObjectURL(img)}
                  alt={`gallery-${index}`}
                  className="gallery-image"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyPreview;
