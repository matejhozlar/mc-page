import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import "../../css/Companies.css";

const OPTIONS = [
  { value: "networth", label: "Net Worth" },
  { value: "created", label: "Date Created" },
  { value: "name", label: "Alphabetical" },
];

const CompanySortDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  const selectedLabel =
    OPTIONS.find((option) => option.value === value)?.label || "Sort";

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="companies-custom-dropdown" ref={dropdownRef}>
      <button
        className="companies-custom-dropdown-button"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedLabel}
        <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
      </button>

      {open && (
        <div className="companies-custom-dropdown-menu">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`companies-custom-dropdown-item${
                value === option.value ? " active" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanySortDropdown;
