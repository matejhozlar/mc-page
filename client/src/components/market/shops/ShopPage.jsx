import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import NotFound from "../../NotFound.jsx";
import CompanyGallery from "../company/components/CompanyGallery.jsx";
import "../css/ShopPage.css";

const ShopPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState(null);

  const galleryImages = useMemo(() => {
    if (!shop) return [];
    if (Array.isArray(shop.image_urls) && shop.image_urls.length) {
      return shop.image_urls;
    }
    const out = [];
    if (shop.banner_url) out.push(shop.banner_url);
    if (Array.isArray(shop.gallery_urls)) {
      out.push(...shop.gallery_urls.filter(Boolean));
    }
    return out;
  }, [shop]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [shopRes, meRes] = await Promise.all([
          fetch(`/api/market/shop/${shopId}`, { signal: ac.signal }),
          fetch("/api/market/me", {
            credentials: "include",
            signal: ac.signal,
          }),
        ]);

        const [shopData, meData] = await Promise.all([
          shopRes.ok ? shopRes.json().catch(() => null) : null,
          meRes.ok ? meRes.json().catch(() => null) : null,
        ]);

        setShop(shopData);
        setVisitor(meData);

        if (meData) {
          const editsRes = await fetch("/api/market/shop-edits", {
            credentials: "include",
            signal: ac.signal,
          });
          if (editsRes.ok) {
            const edits = await editsRes.json().catch(() => null);
            const all = [
              ...(edits?.pending_edits || []),
              ...(edits?.awaiting_funds_edits || []),
            ];
            const mineForThisShop = all.find(
              (e) => String(e.shop_id) === String(shopId)
            );
            if (mineForThisShop) {
              setEditStatus({
                id: mineForThisShop.id,
                status: mineForThisShop.status,
              });
            }
          }
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("❌ Failed to fetch shop:", err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [shopId]);

  if (loading) return <LoadingSpinner message="Loading shop..." />;
  if (!shop) return <p className="error">Shop not found.</p>;
  if (!shop?.name) return <NotFound />;
  if (!visitor) return <p className="error">Visitor not found.</p>;

  const isFounder =
    visitor?.companies?.some(
      (c) => c.id === shop.company_id && c.role === "Founder"
    ) ?? false;

  const createdStr = shop.created_at
    ? new Date(shop.created_at).toLocaleDateString()
    : "";

  return (
    <div className="shop-page">
      {/* Existing edit banner */}
      {editStatus && (
        <div className="shop-page-owner-dashboard info">
          <span>
            {editStatus.status === "pending" &&
              "An edit for this shop is pending review."}
            {editStatus.status === "awaiting_funds" &&
              "An edit for this shop is awaiting payment."}
          </span>
          <button
            className="shop-page-button"
            onClick={() => navigate("/market/requests")}
            title="View edit status"
          >
            View Status
          </button>
        </div>
      )}
      {/* Owner Dashboard */}
      {isFounder && (
        <div className="shop-page-owner-dashboard">
          <button
            className="shop-page-button"
            onClick={() => navigate(`/market/shop/${shopId}/edit`)}
            title="Edit shop"
            disabled={!!editStatus}
          >
            Edit
          </button>
        </div>
      )}

      {/* Header */}
      <div className="shop-page-banner">
        <div className="shop-page-banner-left">
          <img
            src={shop.logo_url || "/assets/market/default/default-logo.png"}
            alt="Shop logo"
            className="shop-page-logo"
          />
          <div className="shop-page-meta">
            <h1 className="shop-page-title">{shop.name}</h1>
            <p className="shop-page-details">
              {createdStr ? <>Created on: {createdStr} • </> : null}
              {shop.company_id && (
                <>
                  Company:{" "}
                  <Link
                    className="shop-page-company-link"
                    to={`/market/company/${shop.company_id}`}
                  >
                    {shop.company_name || `#${shop.company_id}`}
                  </Link>
                </>
              )}
            </p>
            {shop.short_description && (
              <p className="shop-page-short-desc">{shop.short_description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Banner image */}
      {shop.banner_url && (
        <div className="shop-page-banner-image">
          <img
            src={shop.banner_url}
            alt="Shop banner"
            className="shop-page-banner-img"
          />
        </div>
      )}

      {/* Description */}
      {shop.description && (
        <div className="shop-page-description-box">
          <h2 className="shop-page-section-title">Description</h2>
          <ReactMarkdown>{shop.description}</ReactMarkdown>
        </div>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <div className="shop-page-gallery">
          <CompanyGallery images={galleryImages} />
        </div>
      )}
    </div>
  );
};

export default ShopPage;
