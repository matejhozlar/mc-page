import { useEffect, useState } from "react";

const ChooseCompanyModal = ({ companies, onCancel, onChoose }) => {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (companies.length === 1) setSelected(companies[0].id);
  }, [companies]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Select a company</h3>
        <p className="small">You can create up to 5 shops per company.</p>

        {companies.length === 0 ? (
          <p className="upload-error">No eligible companies found.</p>
        ) : (
          <div className="create-form-group">
            <select
              className="form-control"
              value={selected ?? ""}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              <option value="" disabled>
                Choose a company…
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{" "}
                  {typeof c.shop_count === "number"
                    ? `(${c.shop_count}/5 shops)`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="preview-actions">
          <button className="create-back-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="submit-company-btn"
            onClick={() => selected && onChoose(selected)}
            disabled={!selected}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseCompanyModal;
