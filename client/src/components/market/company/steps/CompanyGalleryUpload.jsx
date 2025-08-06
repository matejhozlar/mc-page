const CompanyGalleryUpload = ({ images, onChange }) => {
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5);
    onChange(selected);
  };

  return (
    <div className="form-group">
      <label>Upload Gallery Images (up to 5)</label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
      />
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
