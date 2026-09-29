"use client";

import { useState } from "react";
import type { SocialLink } from "@/server/config/registry";
import { fieldClass, secondaryButtonClass } from "@/components/styles";

export function SocialLinksField({
  name,
  initial,
  labels,
}: {
  name: string;
  initial: SocialLink[];
  labels: { platform: string; url: string; add: string; remove: string };
}) {
  const [rows, setRows] = useState<SocialLink[]>(initial);

  function update(index: number, patch: Partial<SocialLink>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((row) => row.platform || row.url))} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
          <input
            className={fieldClass}
            aria-label={labels.platform}
            value={row.platform}
            onChange={(event) => update(index, { platform: event.target.value })}
          />
          <input
            className={fieldClass}
            aria-label={labels.url}
            value={row.url}
            onChange={(event) => update(index, { url: event.target.value })}
            dir="ltr"
          />
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
          >
            {labels.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setRows((current) => [...current, { platform: "", url: "" }])}
      >
        {labels.add}
      </button>
    </div>
  );
}
