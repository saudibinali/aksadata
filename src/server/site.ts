import "server-only";
import { getSetting } from "@/server/config/settings";
import type { SocialLink } from "@/server/config/registry";

export type PublicSite = {
  name: string;
  email: string;
  phone: string;
  footer: string;
  socialLinks: SocialLink[];
  logoMediaId: string;
  faviconMediaId: string;
};

export async function getPublicSite(locale: string): Promise<PublicSite> {
  const fallbackName = locale === "ar" ? "أكسا داتا" : "Aksa Data";
  try {
    const [nameAr, nameEn, email, phone, footerAr, footerEn, socialLinks, logoMediaId, faviconMediaId] =
      await Promise.all([
        getSetting("site.name.ar"),
        getSetting("site.name.en"),
        getSetting("site.contact.email"),
        getSetting("site.contact.phone"),
        getSetting("site.footer.ar"),
        getSetting("site.footer.en"),
        getSetting("site.socialLinks"),
        getSetting("site.logoMediaId"),
        getSetting("site.faviconMediaId"),
      ]);

    return {
      name: (locale === "ar" ? nameAr : nameEn) || fallbackName,
      email,
      phone,
      footer: locale === "ar" ? footerAr : footerEn,
      socialLinks,
      logoMediaId,
      faviconMediaId,
    };
  } catch {
    return {
      name: fallbackName,
      email: "",
      phone: "",
      footer: "",
      socialLinks: [],
      logoMediaId: "",
      faviconMediaId: "",
    };
  }
}
