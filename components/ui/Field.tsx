import { cloneElement, isValidElement } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode, TextareaHTMLAttributes } from "react";

import styles from "./Field.module.css";

type FieldProps = {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

export function Field({ id, label, help, error, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })
    : children;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id} id={`${id}-label`}>
        {label}
      </label>
      {control}
      {error ? (
        <span className={styles.error} id={errorId}>
          {error}
        </span>
      ) : null}
      {help ? (
        <span className={styles.help} id={helpId}>
          {help}
        </span>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={[styles.control, className].filter(Boolean).join(" ")} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={[styles.control, styles.textarea, className].filter(Boolean).join(" ")}
    />
  );
}

type CheckboxProps = { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.check, className].filter(Boolean).join(" ")}>
      <input {...rest} type="checkbox" className={styles.box} />
      <span>{label}</span>
    </label>
  );
}
