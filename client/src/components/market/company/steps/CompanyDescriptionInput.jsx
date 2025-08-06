const CompanyDescriptionInput = ({
  description,
  shortDescription,
  onChange,
}) => (
  <div className="form-group">
    <label>Short Description (max 128 chars)</label>
    <input
      type="text"
      maxLength={128}
      value={shortDescription}
      onChange={(e) => onChange("short_description", e.target.value)}
      placeholder="Brief summary..."
    />

    <label>Long Description (Markdown supported)</label>
    <textarea
      rows={6}
      maxLength={10000}
      value={description}
      onChange={(e) => onChange("description", e.target.value)}
      placeholder="Full description (optional)"
    />
  </div>
);

export default CompanyDescriptionInput;
