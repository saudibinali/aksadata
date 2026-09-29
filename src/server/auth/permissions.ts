export const PERMISSIONS = [
  { key: "admin.access", description: "Open the admin panel" },
  { key: "users.read", description: "View users" },
  { key: "users.update", description: "Update user status and username" },
  { key: "users.roles", description: "Assign roles to users" },
  { key: "roles.read", description: "View roles and permissions" },
  { key: "roles.manage", description: "Create roles and change role permissions" },
  { key: "settings.read", description: "View settings" },
  { key: "settings.update", description: "Update settings and site media" },
  { key: "features.read", description: "View feature flags" },
  { key: "features.update", description: "Update implemented feature flags" },
  { key: "audit.read", description: "View the audit log" },
  { key: "media.read", description: "View media metadata and upload policy" },
  { key: "content.read", description: "View posts and comments" },
  { key: "content.moderate", description: "Change content status" },
  { key: "usernames.manage", description: "Manage reserved usernames" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((item) => item.key);

const ALL_EXCEPT_ROLE_MANAGE = PERMISSION_KEYS.filter((key) => key !== "roles.manage");

export const SYSTEM_ROLES = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full governance access. Its permission set is owned by the software catalog.",
    permissions: PERMISSION_KEYS,
  },
  {
    key: "ADMINISTRATOR",
    name: "Administrator",
    description: "Operational administration without changing the permission matrix.",
    permissions: ALL_EXCEPT_ROLE_MANAGE,
  },
  {
    key: "MODERATOR",
    name: "Moderator",
    description: "User review, content moderation, and audit visibility.",
    permissions: [
      "admin.access",
      "users.read",
      "content.read",
      "content.moderate",
      "media.read",
      "audit.read",
    ],
  },
  {
    key: "CONTENT_MANAGER",
    name: "Content Manager",
    description: "Content and media review.",
    permissions: ["admin.access", "content.read", "content.moderate", "media.read"],
  },
  {
    key: "EVENT_MANAGER",
    name: "Event Manager",
    description: "Reserved for the events module. No event permissions exist yet.",
    permissions: ["admin.access"],
  },
  {
    key: "SUPPORT",
    name: "Support",
    description: "Read-only access to users and the audit log.",
    permissions: ["admin.access", "users.read", "audit.read"],
  },
  {
    key: "MARKETING",
    name: "Marketing",
    description: "Read-only access to public settings and feature flags.",
    permissions: ["admin.access", "settings.read", "features.read"],
  },
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"];

export function permissionMessageKey(key: string) {
  return key.replaceAll(".", "_");
}
