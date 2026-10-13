"use client";

import { useState, useCallback } from "react";

export function useTransactionSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;

      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  const isAllSelected = useCallback(
    (totalIds: string[]) => {
      return totalIds.length > 0 && totalIds.every((id) => selectedIds.has(id));
    },
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    removeSelection,
    isSelected,
    isAllSelected,
  };
}
