export const TECHNICAL_UPLOAD_CEILING_BYTES = 10 * 1024 * 1024;

export type SocialLink = {
  platform: string;
  url: string;
};

export type SettingGroup = "site" | "username" | "media" | "content" | "security";

type SettingBase = {
  group: SettingGroup;
  isPublic: boolean;
  /** Reserved settings are stored now and consumed when their module is built. */
  module: "active" | "reserved";
};

export type SettingDefinition =
  | (SettingBase & {
      type: "string";
      defaultValue: string;
      editor: "text" | "textarea" | "hidden";
      maxLength: number;
    })
  | (SettingBase & {
      type: "number";
      defaultValue: number;
      editor: "number";
      min: number;
      max: number;
    })
  | (SettingBase & {
      type: "stringArray";
      defaultValue: string[];
      editor: "mimeList";
    })
  | (SettingBase & {
      type: "socialLinks";
      defaultValue: SocialLink[];
      editor: "social";
    });

export const settingsRegistry = {
  "site.name.ar": {
    group: "site",
    type: "string",
    defaultValue: "أكسا داتا",
    isPublic: true,
    module: "active",
    editor: "text",
    maxLength: 80,
  },
  "site.name.en": {
    group: "site",
    type: "string",
    defaultValue: "Aksa Data",
    isPublic: true,
    module: "active",
    editor: "text",
    maxLength: 80,
  },
  "site.contact.email": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "text",
    maxLength: 320,
  },
  "site.contact.phone": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "text",
    maxLength: 30,
  },
  "site.footer.ar": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "textarea",
    maxLength: 500,
  },
  "site.footer.en": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "textarea",
    maxLength: 500,
  },
  "site.socialLinks": {
    group: "site",
    type: "socialLinks",
    defaultValue: [],
    isPublic: true,
    module: "active",
    editor: "social",
  },
  "site.logoMediaId": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "hidden",
    maxLength: 40,
  },
  "site.faviconMediaId": {
    group: "site",
    type: "string",
    defaultValue: "",
    isPublic: true,
    module: "active",
    editor: "hidden",
    maxLength: 40,
  },
  "username.minLength": {
    group: "username",
    type: "number",
    defaultValue: 3,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 2,
    max: 24,
  },
  "username.maxLength": {
    group: "username",
    type: "number",
    defaultValue: 20,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 3,
    max: 32,
  },
  "username.pattern": {
    group: "username",
    type: "string",
    defaultValue: "^[a-z0-9_]+$",
    isPublic: false,
    module: "active",
    editor: "text",
    maxLength: 100,
  },
  "media.maxUploadBytes": {
    group: "media",
    type: "number",
    defaultValue: 5_242_880,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 1024,
    max: TECHNICAL_UPLOAD_CEILING_BYTES,
  },
  "media.allowedMimeTypes": {
    group: "media",
    type: "stringArray",
    defaultValue: ["image/jpeg", "image/png", "image/webp"],
    isPublic: false,
    module: "active",
    editor: "mimeList",
  },
  "media.maxPhotosPerPost": {
    group: "media",
    type: "number",
    defaultValue: 4,
    isPublic: false,
    module: "reserved",
    editor: "number",
    min: 0,
    max: 20,
  },
  "media.maxWeeklyPhotos": {
    group: "media",
    type: "number",
    defaultValue: 20,
    isPublic: false,
    module: "reserved",
    editor: "number",
    min: 0,
    max: 500,
  },
  "content.maxCommentLength": {
    group: "content",
    type: "number",
    defaultValue: 2000,
    isPublic: false,
    module: "reserved",
    editor: "number",
    min: 1,
    max: 10000,
  },
  "content.maxCommentsPerHour": {
    group: "content",
    type: "number",
    defaultValue: 30,
    isPublic: false,
    module: "reserved",
    editor: "number",
    min: 0,
    max: 1000,
  },
  "security.sessionDays": {
    group: "security",
    type: "number",
    defaultValue: 14,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 1,
    max: 90,
  },
  "security.passwordMinLength": {
    group: "security",
    type: "number",
    defaultValue: 12,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 10,
    max: 64,
  },
  "security.loginMaxAttempts": {
    group: "security",
    type: "number",
    defaultValue: 10,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 3,
    max: 50,
  },
  "security.loginWindowMinutes": {
    group: "security",
    type: "number",
    defaultValue: 15,
    isPublic: false,
    module: "active",
    editor: "number",
    min: 1,
    max: 120,
  },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof settingsRegistry;

export const SETTING_KEYS = Object.keys(settingsRegistry) as SettingKey[];

export const SETTING_GROUPS: SettingGroup[] = [
  "site",
  "username",
  "media",
  "content",
  "security",
];

export type FeatureKey =
  | "registration"
  | "credentialsLogin"
  | "comments"
  | "photos"
  | "privateMessaging"
  | "ratings"
  | "aksaGlobal"
  | "userFollowing"
  | "verification"
  | "gamification"
  | "customEvents"
  | "advertising"
  | "socialProfileLinks";

export const featureRegistry: Record<
  FeatureKey,
  { implemented: boolean; defaultEnabled: boolean; locked?: boolean }
> = {
  registration: { implemented: true, defaultEnabled: false },
  credentialsLogin: { implemented: true, defaultEnabled: true, locked: true },
  comments: { implemented: false, defaultEnabled: false },
  photos: { implemented: false, defaultEnabled: false },
  privateMessaging: { implemented: false, defaultEnabled: false },
  ratings: { implemented: false, defaultEnabled: false },
  aksaGlobal: { implemented: false, defaultEnabled: false },
  userFollowing: { implemented: false, defaultEnabled: false },
  verification: { implemented: false, defaultEnabled: false },
  gamification: { implemented: false, defaultEnabled: false },
  customEvents: { implemented: false, defaultEnabled: false },
  advertising: { implemented: false, defaultEnabled: false },
  socialProfileLinks: { implemented: false, defaultEnabled: false },
};

export const FEATURE_KEYS = Object.keys(featureRegistry) as FeatureKey[];

export function settingMessageKey(key: string) {
  return key.replaceAll(".", "_");
}
