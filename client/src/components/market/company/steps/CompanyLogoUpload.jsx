const CompanyLogoUpload = ({ logo, onChange }) => (
  <div className="form-group">
    <label>Upload Logo</label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => onChange(e.target.files[0])}
    />
    {logo && <img src={URL.createObjectURL(logo)} alt="Preview" height={80} />}
  </div>
);

export default CompanyLogoUpload;
