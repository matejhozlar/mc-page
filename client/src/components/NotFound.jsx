import React from "react";
import "./css/NotFound.css";

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
