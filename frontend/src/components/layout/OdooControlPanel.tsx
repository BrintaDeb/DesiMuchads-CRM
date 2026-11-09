"use client";

import React from "react";
import {
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  BarChart3,
  Search,
  Filter,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "kanban" | "list" | "calendar" | "pivot";

interface OdooControlPanelProps {
  appName: string;
  viewName: string;
  onNewClick?: () => void;
  newButtonLabel?: string;
  secondaryActions?: React.ReactNode;
  activeView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  availableViews?: ViewMode[];
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  totalCount?: number;
  totalAmountText?: string;
  children?: React.ReactNode;
}

export function OdooControlPanel({
  appName,
  viewName,
  onNewClick,
  newButtonLabel = "New",
  secondaryActions,
  activeView = "kanban",
  onViewChange,
  availableViews = ["kanban", "list"],
  searchValue = "",
  onSearchChange,
  totalCount,
  totalAmountText,
  children,
}: OdooControlPanelProps) {
  return (
    <div className="bg-white border-b border-slate-200 -mx-3 sm:-mx-6 lg:-mx-8 -mt-12 pt-14 px-3 sm:px-6 lg:px-8 pb-3 shadow-xs mb-6">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Breadcrumbs & Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">{appName}</span>
            <span className="text-slate-300">/</span>
            <h1 className="text-slate-900 font-bold text-sm sm:text-base tracking-tight">{viewName}</h1>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onNewClick && (
              <button
                onClick={onNewClick}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>{newButtonLabel}</span>
              </button>
            )}

            {secondaryActions}
          </div>
        </div>

        {/* Center/Right: Fast Search, Metric Summary, and View Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between md:justify-end">
          {/* Search bar */}
          {onSearchChange && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex-1 sm:flex-initial sm:w-64 focus-within:border-[#714B67] focus-within:bg-white transition-all">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search or filter records..."
                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs"
              />
            </div>
          )}

          {/* Summary Metric (e.g. 12 deals • ₹ 4,80,000) */}
          {(totalCount !== undefined || totalAmountText) && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              {totalCount !== undefined && <span>{totalCount} records</span>}
              {totalCount !== undefined && totalAmountText && <span>•</span>}
              {totalAmountText && <span className="font-semibold text-slate-700">{totalAmountText}</span>}
            </div>
          )}

          {/* Odoo View Switcher */}
          {availableViews.length > 1 && onViewChange && (
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
              {availableViews.includes("kanban") && (
                <button
                  onClick={() => onViewChange("kanban")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeView === "kanban"
                      ? "bg-white text-[#714B67] shadow-xs font-medium"
                      : "hover:text-slate-900 text-slate-400"
                  )}
                  title="Kanban Board View"
                >
                  <LayoutGrid size={15} />
                </button>
              )}

              {availableViews.includes("list") && (
                <button
                  onClick={() => onViewChange("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeView === "list"
                      ? "bg-white text-[#714B67] shadow-xs font-medium"
                      : "hover:text-slate-900 text-slate-400"
                  )}
                  title="List / Table View"
                >
                  <ListIcon size={15} />
                </button>
              )}

              {availableViews.includes("calendar") && (
                <button
                  onClick={() => onViewChange("calendar")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeView === "calendar"
                      ? "bg-white text-[#714B67] shadow-xs font-medium"
                      : "hover:text-slate-900 text-slate-400"
                  )}
                  title="Calendar View"
                >
                  <CalendarIcon size={15} />
                </button>
              )}

              {availableViews.includes("pivot") && (
                <button
                  onClick={() => onViewChange("pivot")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    activeView === "pivot"
                      ? "bg-white text-[#714B67] shadow-xs font-medium"
                      : "hover:text-slate-900 text-slate-400"
                  )}
                  title="Analytics / Pivot View"
                >
                  <BarChart3 size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {children && <div className="mt-2.5 pt-2 border-t border-slate-100">{children}</div>}
    </div>
  );
}

