import React, { useEffect, useRef } from "react";

const TableSelectionCheckbox = ({
  checked = false,
  disabled = false,
  indeterminate = false,
  label,
  onChange,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label className={`table-selection-check ${disabled ? "disabled" : ""}`}>
      <input
        ref={inputRef}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{checked ? "\u2713" : indeterminate ? "-" : ""}</span>
    </label>
  );
};

export default TableSelectionCheckbox;
