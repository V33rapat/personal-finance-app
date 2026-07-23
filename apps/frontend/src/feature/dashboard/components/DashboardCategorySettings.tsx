"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { TH_TEXT } from "@/constants/th";
import type {
  DashboardOverview,
  DashboardTransactionType,
} from "../hooks/useDashboardOverview";

interface CategoryOption {
  id: string;
  name: string;
  type: DashboardTransactionType;
}

interface DashboardCategorySettingsProps {
  overview: DashboardOverview;
  hiddenCategoryIds: string[];
  isSaving: boolean;
  onHiddenChange: (categoryId: string, isHidden: boolean) => void;
  onShowAll: () => void;
}

function getCategoryOptions(overview: DashboardOverview) {
  const options = new Map<string, CategoryOption>();

  for (const day of overview.days) {
    for (const type of ["income", "expense"] as const) {
      const categories = type === "income" ? day.income_categories : day.expense_categories;

      for (const category of categories) {
        if (category.category_id) {
          options.set(category.category_id, {
            id: category.category_id,
            name: category.category_name,
            type,
          });
        }
      }
    }
  }

  return [...options.values()].sort((first, second) => first.name.localeCompare(second.name, "th"));
}

function CategoryGroup({
  title,
  options,
  hiddenCategoryIds,
  isSaving,
  onHiddenChange,
}: {
  title: string;
  options: CategoryOption[];
  hiddenCategoryIds: Set<string>;
  isSaving: boolean;
  onHiddenChange: (categoryId: string, isHidden: boolean) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      <div className="mt-2 space-y-1">
        {options.map((category) => {
          const isVisible = !hiddenCategoryIds.has(category.id);

          return (
            <label
              key={category.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="min-w-0 truncate">{category.name}</span>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(event) => onHiddenChange(category.id, !event.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 shrink-0 accent-violet-600"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default function DashboardCategorySettings({
  overview,
  hiddenCategoryIds,
  isSaving,
  onHiddenChange,
  onShowAll,
}: DashboardCategorySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo(() => getCategoryOptions(overview), [overview]);
  const hiddenCategoryIdSet = useMemo(() => new Set(hiddenCategoryIds), [hiddenCategoryIds]);
  const incomeOptions = options.filter((option) => option.type === "income");
  const expenseOptions = options.filter((option) => option.type === "expense");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={TH_TEXT.dashboard.configureCategories}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={TH_TEXT.dashboard.configureCategories}
          className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {TH_TEXT.dashboard.configureCategories}
            </p>
            <button
              type="button"
              onClick={onShowAll}
              disabled={isSaving || hiddenCategoryIds.length === 0}
              className="text-sm font-semibold text-violet-600 transition hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:text-violet-200"
            >
              {TH_TEXT.dashboard.showAllCategories}
            </button>
          </div>

          {options.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {TH_TEXT.dashboard.noCategoriesInPeriod}
            </p>
          ) : (
            <div className="mt-4 max-h-72 space-y-5 overflow-y-auto pr-1">
              <CategoryGroup
                title={TH_TEXT.dashboard.income}
                options={incomeOptions}
                hiddenCategoryIds={hiddenCategoryIdSet}
                isSaving={isSaving}
                onHiddenChange={onHiddenChange}
              />
              <CategoryGroup
                title={TH_TEXT.dashboard.expense}
                options={expenseOptions}
                hiddenCategoryIds={hiddenCategoryIdSet}
                isSaving={isSaving}
                onHiddenChange={onHiddenChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
