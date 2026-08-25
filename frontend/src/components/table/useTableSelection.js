import { useCallback, useEffect, useMemo, useState } from "react";

const normalizeId = (id) => String(id);
const defaultGetRowId = (row) => row?.id;

export const useTableSelection = ({ rows = [], getRowId = defaultGetRowId, disabled = false, pruneOnRowsChange = false } = {}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const visibleIds = useMemo(
    () => rows.map(getRowId).filter((id) => id !== undefined && id !== null).map(normalizeId),
    [getRowId, rows]
  );

  useEffect(() => {
    if (!pruneOnRowsChange) return;
    const validIds = new Set(visibleIds);
    setSelectedIds((current) => {
      const next = current.filter((id) => validIds.has(normalizeId(id)));
      return next.length === current.length ? current : next;
    });
  }, [pruneOnRowsChange, visibleIds]);

  const selectedIdSet = useMemo(
    () => new Set(selectedIds.map(normalizeId)),
    [selectedIds]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIdSet.has(normalizeId(getRowId(row)))),
    [getRowId, rows, selectedIdSet]
  );

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIdSet.has(id));
  const isHeaderIndeterminate = someVisibleSelected && !allVisibleSelected;

  const clearSelection = useCallback(() => {
    if (disabled) return;
    setSelectedIds([]);
  }, [disabled]);

  const removeSelectedIds = useCallback((ids) => {
    const removeSet = new Set((ids || []).map(normalizeId));
    setSelectedIds((current) => current.filter((id) => !removeSet.has(normalizeId(id))));
  }, []);

  const toggleRow = useCallback((id) => {
    if (disabled || id === undefined || id === null) return;
    const normalizedId = normalizeId(id);
    setSelectedIds((current) =>
      current.some((item) => normalizeId(item) === normalizedId)
        ? current.filter((item) => normalizeId(item) !== normalizedId)
        : [...current, id]
    );
  }, [disabled]);

  const toggleVisible = useCallback(() => {
    if (disabled) return;
    setSelectedIds((current) => {
      const currentSet = new Set(current.map(normalizeId));
      if (visibleIds.length > 0 && visibleIds.every((id) => currentSet.has(id))) {
        return current.filter((id) => !visibleIds.includes(normalizeId(id)));
      }
      return Array.from(new Set([...current.map(normalizeId), ...visibleIds]));
    });
  }, [disabled, visibleIds]);

  const isSelected = useCallback((id) => selectedIdSet.has(normalizeId(id)), [selectedIdSet]);

  return {
    allVisibleSelected,
    clearSelection,
    isHeaderIndeterminate,
    isSelected,
    removeSelectedIds,
    selectedCount: selectedIds.length,
    selectedIds,
    selectedRows,
    someVisibleSelected,
    setSelectedIds,
    toggleRow,
    toggleVisible,
    toggleVisibleRows: toggleVisible,
  };
};
