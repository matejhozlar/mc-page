import React from "react";
import "./css/notfound.css"; // Import the external CSS file

function NotFound() {
  return (
    <div className="notfound-wrapper">
      <h1 className="notfound-title">404</h1>
      <p className="notfound-message">
        Oops! The page you’re looking for doesn’t exist.
      </p>
    </div>
  );
}

export default NotFound;
