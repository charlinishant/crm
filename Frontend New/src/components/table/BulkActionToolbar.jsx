import React from "react";

const BulkActionToolbar = ({
  clearLabel = "Clear selection",
  count = 0,
  deleteLabel = "Delete selected",
  disabled = false,
  entityLabel = "records",
  isDeleting = false,
  onClear,
  onDelete,
}) => (
  <div className="bulk-action-toolbar">
    <span>{count} {count === 1 ? entityLabel.replace(/s$/, "") : entityLabel} selected</span>
    <div>
      <button type="button" className="secondary" onClick={onClear} disabled={disabled || isDeleting}>
        {clearLabel}
      </button>
      <button type="button" className="danger" onClick={onDelete} disabled={disabled || isDeleting || count === 0}>
        {isDeleting ? "Deleting..." : deleteLabel}
      </button>
    </div>
  </div>
);

export default BulkActionToolbar;
