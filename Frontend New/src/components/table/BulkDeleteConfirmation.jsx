import React from "react";

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

  if (!hasSelection) return null;

  const singularLabel = entityLabel.replace(/s$/, "");
  const dialogTitle = title || `Delete ${count} selected ${count === 1 ? singularLabel : entityLabel}?`;
  const handleConfirm = () => {
    if (!hasSelection || isDeleting) return;
    onConfirm?.();
  };

  return (
    <div className="bulk-delete-backdrop" role="presentation">
      <section className="bulk-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="bulk-delete-title">
        <div className="bulk-delete-icon">!</div>
        <h3 id="bulk-delete-title">{dialogTitle}</h3>
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
