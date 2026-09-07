"use client";

import { useState } from "react";

type PlacingMode = "cafe" | "billboard" | null;

type FloatingActionsProps = {
  placingMode: PlacingMode;
  onToggleMode: (mode: PlacingMode) => void;
};

export default function FloatingActions({ placingMode, onToggleMode }: FloatingActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2.5">
      {open && (
        <div className="flex flex-col items-end gap-2">
          <ActionButton
            active={placingMode === "cafe"}
            icon="☕"
            label="Pin a cafe"
            onClick={() => {
              onToggleMode("cafe");
              setOpen(false);
            }}
          />
          <ActionButton
            active={placingMode === "billboard"}
            icon="📢"
            label="Place a billboard"
            onClick={() => {
              onToggleMode("billboard");
              setOpen(false);
            }}
          />
        </div>
      )}

      <button
        onClick={() => {
          if (placingMode) {
            onToggleMode(null);
            setOpen(false);
          } else {
            setOpen((v) => !v);
          }
        }}
        aria-label={placingMode ? "Cancel placing" : "Add to map"}
        title={placingMode ? "Cancel placement" : "Add to map"}
        className={`map-add-button flex h-14 w-14 items-center justify-center rounded-full text-3xl leading-none font-light text-white shadow-xl transition-transform ${
          placingMode ? "bg-red-500" : "bg-amber-500 hover:bg-amber-600"
        } ${open ? "rotate-45" : ""}`}
      >
        +
      </button>
    </div>
  );
}

function ActionButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`map-action-button flex items-center gap-2 rounded-full py-2 pr-4 pl-2.5 text-sm font-medium whitespace-nowrap shadow-lg transition-colors ${
        active
          ? "bg-amber-500 text-white"
          : "bg-white text-neutral-700 hover:bg-amber-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-base">
        {icon}
      </span>
      {label}
    </button>
  );
}
