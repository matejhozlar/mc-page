const CompanyNameInput = ({ value, onChange }) => (
  <div className="create-form-group">
    <label>Company Name *</label>
    <input
      type="text"
      className="form-control"
      required
      maxLength={255}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="My Awesome Company"
    />
  </div>
);

export default CompanyNameInput;
