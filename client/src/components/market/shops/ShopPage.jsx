import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "../../LoadingSpinner.jsx";
import NotFound from "../../NotFound.jsx";
import CompanyGallery from "../company/components/CompanyGallery.jsx";
import ShopItems from "./ShopItems.jsx";
import ShopOwnershipCard from "./ShopOwnerShipCard.jsx";
import BlueMapViewer from "./components/BlueMapViewer.jsx";
import LocationSettingsModal from "./components/LocationSettingsModal.jsx";
import "../css/ShopPage.css";

const DIM_TO_WORLD = {
  overworld: "world",
  nether: "world_the_nether",
  end: "world_the_end",
};

const buildBlueMapUrl = (base, { dimension, x, y, z }, cam = {}) => {
  const world = DIM_TO_WORLD[dimension] || DIM_TO_WORLD.overworld;
  const {
    distance = 200,
    yaw = 0,
    pitch = 0,
    roll = 0,
    tilt = 0,
    projection = "perspective",
  } = cam;
  const safeY = y ?? 64;
  return `${base.replace(/\/+$/, "")}/#${[
    world,
    Number(x) || 0,
    Number(safeY) || 64,
    Number(z) || 0,
    Number(distance),
    Number(yaw),
    Number(pitch),
    Number(roll),
    Number(tilt),
    projection,
  ].join(":")}`;
};

const ShopPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState(null);

  const [owners, setOwners] = useState(null);
  const [ownersLoading, setOwnersLoading] = useState(true);

  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [showLocModal, setShowLocModal] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const key = `shop:${shopId}:mapVisible`;
    const saved = localStorage.getItem(key);
    if (saved === "1") setMapVisible(true);
  }, [shopId]);
  useEffect(() => {
    const key = `shop:${shopId}:mapVisible`;
    localStorage.setItem(key, mapVisible ? "1" : "0");
  }, [shopId, mapVisible]);

  const galleryImages = useMemo(() => {
    if (!shop) return [];
    if (Array.isArray(shop.image_urls) && shop.image_urls.length)
      return shop.image_urls;
    const out = [];
    if (shop.banner_url) out.push(shop.banner_url);
    if (Array.isArray(shop.gallery_urls))
      out.push(...shop.gallery_urls.filter(Boolean));
    return out;
  }, [shop]);

  useEffect(() => {
    const ac = new AbortController();
    setLocLoading(true);
    fetch(`/api/market/shop/${shopId}/location`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setLocation(d.location || null))
      .catch(() => setLocation(null))
      .finally(() => setLocLoading(false));
    return () => ac.abort();
  }, [shopId]);

  const saveLocation = async (form) => {
    try {
      setSavingLoc(true);
      const r = await fetch(`/api/market/shop/${shopId}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed to save location");
      setLocation(form);
      setShowLocModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingLoc(false);
    }
  };

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

        const ownersRes = await fetch(`/api/market/shop/${shopId}/owners`, {
          signal: ac.signal,
        });
        if (ownersRes.ok) {
          const ownersData = await ownersRes.json().catch(() => null);
          setOwners(ownersData);
        } else {
          setOwners(null);
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("❌ Failed to fetch shop or owners:", err);
        }
      } finally {
        setLoading(false);
        setOwnersLoading(false);
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
            <Pencil size={16} className="dashboard-button-shift" /> Edit
          </button>
          <button
            className="shop-page-button"
            onClick={() => setShowLocModal(true)}
            title="Set shop location"
          >
            <Settings size={16} /> Map
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

      {/* Map */}
      <section className="companies-section shop-map-wrapper">
        <div className="companies-header" style={{ marginBottom: 12 }}>
          <h2 className="company-section-title">Map</h2>
        </div>

        {locLoading ? (
          <p>Loading map…</p>
        ) : !location ? (
          <p className="companies-meta">
            No location set.{" "}
            {isFounder ? "Click Settings to add coordinates." : ""}
          </p>
        ) : (
          <div className="companies-cards-grid">
            <div
              className="companies-card"
              style={{
                width: "100%",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 8,
              }}
            >
              {!mapVisible ? (
                <>
                  <p className="companies-meta" style={{ marginBottom: 6 }}>
                    {location.dimension} • X:{location.x}, Z:{location.z}
                    {typeof location.y === "number" ? `, Y:${location.y}` : ""}
                  </p>

                  {location.tempad && (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "#9ca3af",
                        background: "rgba(255,255,255,0.05)",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        display: "inline-block",
                        marginBottom: 8,
                      }}
                    >
                      Tempad:{" "}
                      <span style={{ fontWeight: 500 }}>{location.tempad}</span>
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="shop-page-button"
                      onClick={() => setMapVisible(true)}
                      title="Render map"
                    >
                      Show map
                    </button>
                    <a
                      className="shop-page-button"
                      href={buildBlueMapUrl(
                        "https://create-rington.com/bluemap",
                        {
                          dimension: location.dimension,
                          x: location.x,
                          y: location.y,
                          z: location.z,
                        }
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      Open in new tab
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <BlueMapViewer
                    base="https://create-rington.com/bluemap"
                    location={{
                      dimension: location.dimension,
                      x: location.x,
                      y: location.y,
                      z: location.z,
                    }}
                    camera={{
                      distance: 200,
                      yaw: 0,
                      pitch: 0,
                      roll: 0,
                      tilt: 0,
                      projection: "perspective",
                    }}
                    style={{
                      width: "100%",
                      maxWidth: 600,
                      aspectRatio: "4/3",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="shop-page-button"
                      onClick={() => setMapVisible(false)}
                      title="Hide map"
                    >
                      Hide map
                    </button>
                    <a
                      className="shop-page-button"
                      href={buildBlueMapUrl(
                        "https://create-rington.com/bluemap",
                        {
                          dimension: location.dimension,
                          x: location.x,
                          y: location.y,
                          z: location.z,
                        }
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      Open in new tab
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Items */}
      <ShopItems shopId={shopId} isFounder={isFounder} />

      {/* Gallery */}
      {galleryImages.length > 0 && <CompanyGallery images={galleryImages} />}

      {/* Ownership Card */}
      <section className="companies-section">
        <h2
          className="company-section-title"
          style={{ marginBottom: "0.75rem" }}
        >
          Ownership
        </h2>

        {ownersLoading ? (
          <p>Loading ownership…</p>
        ) : owners ? (
          <div className="companies-cards-grid">
            <ShopOwnershipCard
              companyId={owners.company.id}
              companyName={owners.company.name}
              companyLogo={owners.company.logo_url}
              founders={owners.founders}
            />
          </div>
        ) : (
          <p className="companies-meta">Ownership information unavailable.</p>
        )}
      </section>

      {showLocModal && (
        <LocationSettingsModal
          initial={location}
          onSave={saveLocation}
          onCancel={() => setShowLocModal(false)}
          saving={savingLoc}
        />
      )}
    </div>
  );
};

export default ShopPage;
