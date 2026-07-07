"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useCategory, type Category } from "../hooks/useCategory";
import type { TransactionType } from "./TransactionItem";
import { TH_TEXT } from "@/constants/th";

interface CategoryComboboxProps {
  type: TransactionType;
  valueId: string| null;
  onChange: (category: Category | null) => void;
  disabled?: boolean;
}

export interface CategoryComboboxHandle {
  resolveCategory: () => Promise<Category | null>;
}

const CategoryCombobox = forwardRef<CategoryComboboxHandle, CategoryComboboxProps>(
function CategoryCombobox({
  type,
  valueId,
  onChange,
  disabled = false,
}: CategoryComboboxProps, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState<{ valueId: string | null; value: string }>({
    valueId: null,
    value: "",
  });
  const [activeIndex, setActiveIndex] = useState(-1);

  const {
    categories,
    setSearch,
    isLoading,
    isCreating,
    error,
    createCategory,
    findCategoryByName,
  } = useCategory({ type });
  
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === valueId) ?? null,
    [categories, valueId]
  );

  const suggestions = categories;
  const inputValue =
    inputState.valueId === valueId ? inputState.value : selectedCategory?.name ?? "";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const selectCategory = (category: Category) => {
    onChange(category);
    setInputState({ valueId: category.id, value: category.name });
    setSearch(category.name);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const createOrSelectCategory = async () => {
    if (isCreating) return null;

    const name = inputValue.trim();
    if (!name){
      onChange(null);
      return null;
    }

    const existingCategory = findCategoryByName(name);
    if(existingCategory){
      selectCategory(existingCategory);
      return existingCategory;
    }

    const createdCategory = await createCategory({name, type});
    if (createdCategory) {
      selectCategory(createdCategory);
      return createdCategory;
    }

    return null;
  };

  const handleInputChange = (value: string) => {
    setInputState({ valueId: null, value });
    setSearch(value);
    setIsOpen(true);
    setActiveIndex(-1);
    onChange(null);
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (suggestions.length === 0) return -1;
        return Math.min(current + 1, suggestions.length - 1);
      });
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        if (suggestions.length === 0) return -1;
        return Math.max(current - 1, 0);
      });
    }

    if (event.key === "Escape"){
      setIsOpen(false);
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if(isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        selectCategory(suggestions[activeIndex]);
        return;
      }

      await createOrSelectCategory();
    }
  };

  useImperativeHandle(ref, () => ({
    resolveCategory: createOrSelectCategory,
  }));

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={inputValue}
        disabled={disabled || isCreating}
        placeholder={TH_TEXT.transaction.selectCategory}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      {isOpen && (
              <div className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {isLoading && (
                  <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                    กำลังโหลด...
                  </div>
                )}

                {!isLoading &&
                  suggestions.map((category, index) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => selectCategory(category)}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        index === activeIndex
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      <span>{category.name}</span>
                      {category.is_system && (
                        <span className="text-xs text-slate-400">default</span>
                      )}
                    </button>
                  ))}

                {!isLoading && inputValue.trim() && !findCategoryByName(inputValue) && (
                  <button
                    type="button"
                    onClick={createOrSelectCategory}
                    disabled={isCreating}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-violet-600 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300 dark:hover:bg-violet-950/40"
                  >
                    สร้าง “{inputValue.trim()}”
                  </button>
                )}

                {!isLoading && !suggestions.length && !inputValue.trim() && (
                  <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                    ยังไม่มีหมวดหมู่
                  </div>
                )}

                {error && (
                  <div className="border-t border-slate-100 px-3 py-2 text-sm text-red-600 dark:border-slate-800 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });

export default CategoryCombobox;
