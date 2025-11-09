"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FocusAreaId, FOCUS_AREAS } from "@/types/focus-areas";

interface FocusAreaSelectProps {
  selectedAreas: FocusAreaId[];
  onChange: (areas: FocusAreaId[]) => void;
  mode?: "single" | "multi";
  className?: string;
}

export function FocusAreaSelect({
  selectedAreas,
  onChange,
  mode = "multi",
  className,
}: FocusAreaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-focus-area-select]")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  const toggleArea = (areaId: FocusAreaId) => {
    if (mode === "single") {
      onChange([areaId]);
      setIsOpen(false);
    } else {
      const newAreas = selectedAreas.includes(areaId)
        ? selectedAreas.filter((id) => id !== areaId)
        : [...selectedAreas, areaId];
      onChange(newAreas);
    }
  };

  const sortedAreas = Object.values(FOCUS_AREAS).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={cn("relative", className)} data-focus-area-select>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
      >
        {selectedAreas.length === 0 ? (
          <span className="text-slate-500">Select focus areas...</span>
        ) : (
          <span className="text-slate-900">
            {selectedAreas.length === 1
              ? FOCUS_AREAS[selectedAreas[0]].label
              : `${selectedAreas.length} areas selected`}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-96 overflow-y-auto">
          <div className="p-2">
            {sortedAreas.map((area) => {
              const isSelected = selectedAreas.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2.5 text-left transition-colors",
                    "hover:bg-slate-50",
                    isSelected && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">
                        {area.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {area.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface FocusAreaBadgesProps {
  areaIds: FocusAreaId[];
  maxVisible?: number;
  className?: string;
}

export function FocusAreaBadges({
  areaIds,
  maxVisible = 3,
  className,
}: FocusAreaBadgesProps) {
  if (!areaIds || areaIds.length === 0) return null;

  const visibleAreas = areaIds.slice(0, maxVisible);
  const remainingCount = areaIds.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleAreas.map((areaId) => {
        const area = FOCUS_AREAS[areaId];
        if (!area) return null;

        return (
          <span
            key={areaId}
            className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
          >
            {area.label}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

interface FocusAreaFilterChipsProps {
  selectedAreas: FocusAreaId[];
  onChange: (areas: FocusAreaId[]) => void;
  className?: string;
}

export function FocusAreaFilterChips({
  selectedAreas,
  onChange,
  className,
}: FocusAreaFilterChipsProps) {
  const toggleArea = (areaId: FocusAreaId) => {
    const newAreas = selectedAreas.includes(areaId)
      ? selectedAreas.filter((id) => id !== areaId)
      : [...selectedAreas, areaId];
    onChange(newAreas);
  };

  const sortedAreas = Object.values(FOCUS_AREAS).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-medium text-slate-700">Focus Area:</span>
      <button
        onClick={() => onChange([])}
        className={cn(
          "rounded-full border px-3 py-1 text-sm transition-colors",
          selectedAreas.length === 0
            ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
            : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
        )}
      >
        All
      </button>
      {sortedAreas.map((area) => (
        <button
          key={area.id}
          onClick={() => toggleArea(area.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            selectedAreas.includes(area.id)
              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
              : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
          )}
        >
          {area.label}
        </button>
      ))}
    </div>
  );
}
