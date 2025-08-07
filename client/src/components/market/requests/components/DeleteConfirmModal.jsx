import React from "react";
import "../../css/DeleteConfirmModal.css";

function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this rejected request?</p>
        <div className="delete-modal-actions">
          <button
            className="delete-modal-btn delete-modal-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
