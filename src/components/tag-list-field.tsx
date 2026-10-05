"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

type TagListFieldProps = {
  name: string;
  label: string;
  placeholder: string;
};

/** Client-only "add button" list builder for the hackathon registration
 * form — there's no hackathon yet to persist entries to one at a time (the
 * pattern used in Settings), so this just accumulates values locally and
 * renders them as repeated hidden inputs sharing `name`, which the server
 * action reads back via `formData.getAll(name)`. */
export function TagListField({ name, label, placeholder }: TagListFieldProps) {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function addItem() {
    const value = draft.trim();
    if (!value || items.includes(value)) {
      setDraft("");
      return;
    }
    setItems((current) => [...current, value]);
    setDraft("");
  }

  function removeItem(value: string) {
    setItems((current) => current.filter((item) => item !== value));
  }

  return (
    <div>
      <label className="field" htmlFor={inputId}>
        <span>{label}</span>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={addItem}
            className="secondary-button !h-12 shrink-0 !border-violet-200 !px-3 !text-violet-700 text-sm"
          >
            <Plus size={18} aria-hidden="true" />
            Add
          </button>
        </div>
      </label>

      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700"
            >
              <input type="hidden" name={name} value={item} />
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label={`Remove ${item}`}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
