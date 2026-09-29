"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/styles";

export function SubmitButton({
  children,
  pendingLabel,
  className = buttonClass,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
