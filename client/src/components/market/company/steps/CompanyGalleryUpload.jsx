import { useState } from "react";

const CompanyGalleryUpload = ({ images, onChange }) => {
  const MAX_SIZE_MB = 10;
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5);

    const validImages = [];
    let hasError = false;

    for (const file of selected) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        hasError = true;
        continue;
      }
      validImages.push(file);
    }

    if (hasError) {
      setError(
        `One or more files exceeded the ${MAX_SIZE_MB}MB limit and were skipped.`
      );
    } else {
      setError(null);
    }

    onChange(validImages);
  };

  return (
    <div className="create-form-group">
      <label htmlFor="gallery-upload" className="custom-upload-button">
        Upload Gallery Images (up to 5)
      </label>
      <input
        id="gallery-upload"
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden-upload-input"
      />
      {error && <p className="upload-error">{error}</p>}
      <div className="preview-gallery">
        {images.map((file, i) => (
          <img
            key={i}
            src={URL.createObjectURL(file)}
            alt={`gallery-${i}`}
            height={60}
          />
        ))}
      </div>
    </div>
  );
};

export default CompanyGalleryUpload;
