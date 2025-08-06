const CompanyDescriptionInput = ({
  description,
  shortDescription,
  onChange,
}) => (
  <div className="create-form-group">
    <label>
      Short Description (max 128 chars)
      <span className="char-counter">{shortDescription.length}/128</span>
    </label>
    <input
      type="text"
      className="form-control"
      maxLength={128}
      value={shortDescription}
      onChange={(e) => onChange("short_description", e.target.value)}
      placeholder="Brief summary..."
    />

    <label>
      Description (Markdown supported) (max 10,000 chars)
      <span className="char-counter">{description.length}/10000</span>
    </label>
    <textarea
      rows={6}
      maxLength={10000}
      className="form-control"
      value={description}
      onChange={(e) => onChange("description", e.target.value)}
      placeholder="Full description (optional)"
    />
  </div>
);

export default CompanyDescriptionInput;
