import React from "react";
import "../market/css/DeleteConfirmModal.css";

const StatusPopupModal = ({ type = "success", message, onClose }) => {
  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <h3 style={{ color: type === "success" ? "#2ecc71" : "#e74c3c" }}>
          {type === "success" ? "Success" : "Error"}
        </h3>
        <p>{message}</p>
        <div
          className="delete-modal-actions"
          style={{ justifyContent: "center" }}
        >
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            style={{
              background: type === "success" ? "#2ecc71" : "#e74c3c",
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusPopupModal;
