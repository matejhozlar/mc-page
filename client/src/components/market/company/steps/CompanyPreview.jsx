import ReactMarkdown from "react-markdown";

const CompanyPreview = ({ form }) => {
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
            <h1>{form.name}</h1>
            <p>{form.short_description || "Preview"}</p>
          </div>
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
