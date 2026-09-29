export function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
