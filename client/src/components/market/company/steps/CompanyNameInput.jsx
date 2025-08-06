const CompanyNameInput = ({ value, onChange }) => (
  <div className="form-group">
    <label>Company Name *</label>
    <input
      type="text"
      required
      maxLength={255}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="My Awesome Company"
    />
  </div>
);

export default CompanyNameInput;
