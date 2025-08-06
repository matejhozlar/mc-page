import React from "react";
import "../../css/CompanyPage.css";

const CompanyGallery = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="company-gallery">
      <h2 className="company-section-title">Gallery</h2>
      <div className="gallery-carousel">
        {images.map((url, index) => (
          <div key={index} className="gallery-image-wrapper">
            <img
              src={url}
              alt={`Gallery ${index + 1}`}
              className="gallery-image"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyGallery;
