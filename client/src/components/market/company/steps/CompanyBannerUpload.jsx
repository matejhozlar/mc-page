const CompanyLogoUpload = ({ banner, onChange }) => (
  <div className="form-group">
    <label>Upload Banner</label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => onChange(e.target.files[0])}
    />
    {banner && (
      <img src={URL.createObjectURL(banner)} alt="Preview" height={80} />
    )}
  </div>
);

export default CompanyLogoUpload;
