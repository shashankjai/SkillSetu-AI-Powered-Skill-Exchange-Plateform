// client/src/components/knovia/DocumentPicker.jsx
import React from "react";
import { FileText } from "lucide-react";

/** Checkbox list of READY documents. `selected` is an array of ids. */
const DocumentPicker = ({ documents, selected, onChange, max, idPrefix = "doc" }) => {
  const ready = documents.filter((d) => d.status === "ready");
  if (ready.length === 0) return <p className="text-sm text-slate-500">No ready documents yet.</p>;

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (!max || selected.length < max) onChange([...selected, id]);
  };

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {ready.map((d) => {
        const checked = selected.includes(d._id);
        const blocked = !checked && max && selected.length >= max;
        return (
          <li key={d._id}>
            <label htmlFor={`${idPrefix}-${d._id}`} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition ${checked ? "border-blue-600 bg-blue-950/30" : "border-slate-800 bg-[#0F1829] hover:border-slate-600"} ${blocked ? "opacity-40" : ""}`}>
              <input id={`${idPrefix}-${d._id}`} type="checkbox" checked={checked} disabled={blocked} onChange={() => toggle(d._id)} className="h-4 w-4 accent-blue-600" />
              <FileText size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-slate-200">{d.originalName}</span>
              <span className="shrink-0 text-xs text-slate-500">{d.pageCount}p</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
};

export default DocumentPicker;
