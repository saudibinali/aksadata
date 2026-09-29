import { redirect } from "next/navigation";
import { localeFromRequest } from "@/server/http/locale";

export type ActionFailure = { ok: false; error: string };
export type ActionSuccess = { ok: true };

export function fail(error: string): ActionFailure {
  return { ok: false, error };
}

export async function redirectWithFeedback(
  pathname: string,
  feedback: { error?: string; notice?: string },
  formData?: FormData,
): Promise<never> {
  const locale = await localeFromRequest(formData);
  const query = new URLSearchParams();
  if (feedback.error) query.set("error", feedback.error);
  if (feedback.notice) query.set("notice", feedback.notice);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/${locale}${pathname}${suffix}`);
}

export async function stop(
  pathname: string,
  feedback: { error?: string; notice?: string },
  formData?: FormData,
): Promise<never> {
  await redirectWithFeedback(pathname, feedback, formData);
  throw new Error("Redirect did not interrupt the action.");
}
