import React, { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";

const CompactSearchSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicked outside or Escape pressed
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Normalize options
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return {
        value: String(opt.value !== undefined ? opt.value : opt.id !== undefined ? opt.id : ""),
        label: String(opt.label !== undefined ? opt.label : opt.name || opt.title || ""),
        sub: opt.sub ? String(opt.sub) : "",
      };
    }
    return {
      value: String(opt),
      label: String(opt),
      sub: "",
    };
  });

  const searchLower = searchTerm.trim().toLowerCase();
  const filteredOptions = normalizedOptions.filter((opt) =>
    !searchLower ||
    opt.label.toLowerCase().includes(searchLower) ||
    opt.sub.toLowerCase().includes(searchLower) ||
    opt.value.toLowerCase().includes(searchLower)
  );

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const displayText = selectedOption ? (
    <span>
      {selectedOption.label}
      {selectedOption.sub && (
        <span className="text-muted ms-1" style={{ fontSize: "11px" }}>
          {selectedOption.sub}
        </span>
      )}
    </span>
  ) : (
    <span className="text-muted">{placeholder}</span>
  );

  return (
    <div
      className={`compact-select-wrapper ${className}`}
      ref={dropdownRef}
      style={{ width: "100%", maxWidth: "100%", ...style }}
    >
      {label && <label className="compact-select-label">{label}</label>}
      <button
        type="button"
        className={`compact-select-trigger ${isOpen ? "open" : ""} ${value ? "has-value" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: "100%",
          height: "42px",
          minHeight: "42px",
          borderRadius: "8px",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          backgroundColor: disabled ? "#f8fafc" : "#ffffff",
          border: isOpen ? "1px solid #487fff" : "1px solid #d6dee9",
          boxShadow: isOpen ? "0 0 0 3px rgba(72, 127, 255, 0.12)" : "none",
        }}
      >
        <span className="compact-select-value text-truncate">{displayText}</span>
        <FaChevronDown
          className="compact-select-arrow"
          aria-hidden="true"
          style={{
            fontSize: "11px",
            color: "#64748b",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            marginLeft: "8px",
          }}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className="compact-select-menu shadow-lg"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            width: "100%",
            zIndex: 1050,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "6px 0",
            maxHeight: "260px",
          }}
        >
          <div className="compact-select-search-box px-2 pb-2 mb-1 border-bottom">
            <input
              ref={searchInputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: "12px",
                borderRadius: "6px",
                height: "32px",
                border: "1px solid #d6dee9",
                boxShadow: "none",
              }}
            />
          </div>

          <div
            className="compact-select-options compact-select-options-hidden-scroll"
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* Default "Select" / Clear option */}
            <div
              className={`compact-select-option px-3 py-2 d-flex align-items-center justify-content-between ${
                !value ? "selected bg-primary-subtle fw-bold" : ""
              }`}
              onClick={() => handleSelect("")}
              role="option"
              aria-selected={!value}
              style={{ cursor: "pointer", fontSize: "13px" }}
            >
              <span className="compact-select-option-text text-muted">{placeholder}</span>
              {!value && <FaCheck className="compact-select-check text-primary" style={{ fontSize: "10px" }} />}
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = String(value) === String(option.value);
                return (
                  <div
                    key={`${option.value}-${option.label}`}
                    className={`compact-select-option px-3 py-2 d-flex align-items-center justify-content-between ${
                      isSelected ? "selected bg-primary-subtle fw-semibold" : ""
                    }`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    title={option.label}
                    style={{ cursor: "pointer", fontSize: "13px" }}
                  >
                    <div className="d-flex flex-column text-truncate">
                      <span className="compact-select-option-text text-dark">{option.label}</span>
                      {option.sub && (
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          {option.sub}
                        </small>
                      )}
                    </div>
                    {isSelected && (
                      <FaCheck className="compact-select-check text-primary ms-2" style={{ fontSize: "10px" }} />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="compact-select-empty px-3 py-2 text-center text-muted text-sm">
                No matching users found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactSearchSelect;
