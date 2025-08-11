import React from "react";
import "../market/css/DeleteConfirmModal.css";

const ConfirmModal = ({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmTone = "danger",
}) => {
  return (
    <div className="delete-modal-backdrop" role="dialog" aria-modal="true">
      <div className="delete-modal">
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="delete-modal-actions">
          <button className="delete-modal-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`delete-modal-btn delete-modal-btn-confirm`}
            style={{
              background:
                confirmTone === "danger" ? "#e74c3c" : "var(--primary-color)",
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
