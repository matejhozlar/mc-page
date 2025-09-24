import React from "react";
import { NavLink } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import "./css/FloatingHomeButton.css";

function FloatingHomeIcon() {
  return (
    <NavLink to="/" className="floating-home-icon" aria-label="Go Home">
      <FaHome />
    </NavLink>
  );
}

export default FloatingHomeIcon;
