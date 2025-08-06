import { useState } from "react";

const CompanyBannerUpload = ({ banner, onChange }) => {
  const MAX_SIZE_MB = 10;
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Banner must be under ${MAX_SIZE_MB}MB.`);
        onChange(null);
      } else {
        setError(null);
        onChange(file);
      }
    }
  };

  return (
    <div className="create-form-group">
      <label htmlFor="banner-upload" className="custom-upload-button">
        Upload Banner
      </label>
      <input
        id="banner-upload"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden-upload-input"
      />
      {error && <p className="upload-error">{error}</p>}
      {banner && (
        <img src={URL.createObjectURL(banner)} alt="Preview" height={80} />
      )}
    </div>
  );
};

export default CompanyBannerUpload;
