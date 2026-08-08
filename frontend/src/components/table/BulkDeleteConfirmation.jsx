import React, { useEffect } from "react";

const BulkDeleteConfirmation = ({
  count = 0,
  confirmLabel = "Delete",
  entityLabel = "records",
  isDeleting = false,
  message = "This action cannot be undone.",
  names = [],
  onCancel,
  onConfirm,
  title,
}) => {
  const hasSelection = Number(count) > 0;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onCancel]);

  if (!hasSelection) return null;

  const singularLabel = entityLabel.replace(/s$/, "");
  const selectedLabel = count === 1 ? `selected ${singularLabel}` : `${count} selected ${entityLabel}`;
  const dialogTitle = title || `Delete ${selectedLabel}?`;
  const handleConfirm = () => {
    if (!hasSelection || isDeleting) return;
    onConfirm?.();
  };

  return (
    <div className="bulk-delete-backdrop" role="presentation" onClick={isDeleting ? undefined : onCancel}>
      <section
        className="bulk-delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bulk-delete-icon">!</div>
        <h6 id="bulk-delete-title">{dialogTitle}</h6>
        <p>{message}</p>
        {names.length > 0 && (
          <div className="bulk-delete-preview">
            {names.slice(0, 3).map((name) => <span key={name}>{name}</span>)}
            {names.length > 3 && <span>+{names.length - 3} more</span>}
          </div>
        )}
        <div className="bulk-delete-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleConfirm} disabled={isDeleting || !hasSelection}>
            {isDeleting ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default BulkDeleteConfirmation;
