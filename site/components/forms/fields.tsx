"use client";

import type { ReactNode } from "react";

const controlClass =
  "w-full rounded-lg border border-control bg-surface px-3.5 py-2.5 text-sm text-body transition-colors placeholder:text-muted focus:border-accent";

export function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>
        )}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[#b42318] dark:text-[#ff9a91]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BaseProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
};

export function TextField({ id, label, value, onChange, error, hint, required, placeholder, type = "text", autoComplete }: BaseProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${error ? "border-[#b42318]" : ""}`}
      />
    </FieldShell>
  );
}

export function TextArea({ id, label, value, onChange, error, hint, required, placeholder, rows = 5 }: BaseProps & { rows?: number }) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${error ? "border-[#b42318]" : ""}`}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required,
  placeholder = "Please choose",
}: BaseProps & { options: readonly string[] }) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        name={id}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${error ? "border-[#b42318]" : ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
  error,
  hint,
}: {
  legend: string;
  options: readonly { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  error?: string;
  hint?: string;
}) {
  const groupId = legend.toLowerCase().replace(/\s+/g, "-");
  return (
    <fieldset aria-describedby={error ? `${groupId}-error` : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-3 space-y-2.5">
        {options.map((option) => (
          <label
            key={option.id}
            htmlFor={`${groupId}-${option.id}`}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-control p-3 text-sm transition-colors hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <input
              id={`${groupId}-${option.id}`}
              name={groupId}
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span className="leading-relaxed">{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${groupId}-error`} role="alert" className="mt-2 text-xs font-medium text-[#b42318] dark:text-[#ff9a91]">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
