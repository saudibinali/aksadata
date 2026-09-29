import "dotenv/config";
import { PrismaClient, ReservedNameCategory, UserStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { FEATURE_KEYS, SETTING_KEYS, featureRegistry, settingsRegistry } from "../src/server/config/registry";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/server/auth/permissions";
import { validatePassword, validateUsername } from "../src/server/users/rules";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const starterReserved = [
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "moderator",
  "aksa",
  "aksadata",
  "official",
  "government",
  "help",
  "security",
  "staff",
];

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { description: permission.description },
    });
  }

  const permissionRows = await prisma.permission.findMany();
  const permissionByKey = new Map(permissionRows.map((row) => [row.key, row.id]));

  for (const role of SYSTEM_ROLES) {
    const saved = await prisma.role.upsert({
      where: { key: role.key },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        system: true,
      },
      update: {
        name: role.name,
        description: role.description,
        system: true,
      },
    });

    const assigned = await prisma.rolePermission.count({ where: { roleId: saved.id } });
    if (role.key === "SUPER_ADMIN" || assigned === 0) {
      await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
      await prisma.rolePermission.createMany({
        data: role.permissions.map((key) => ({
          roleId: saved.id,
          permissionId: permissionByKey.get(key)!,
        })),
      });
    }
  }

  for (const key of SETTING_KEYS) {
    const definition = settingsRegistry[key];
    await prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: definition.defaultValue,
        valueType:
          definition.type === "number"
            ? "NUMBER"
            : definition.type === "string"
              ? "STRING"
              : "JSON",
        group: definition.group,
        isPublic: definition.isPublic,
      },
      update: {},
    });
  }

  for (const key of FEATURE_KEYS) {
    const definition = featureRegistry[key];
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled: definition.defaultEnabled },
      update: {},
    });
  }

  const reservedCount = await prisma.reservedUsername.count();
  if (reservedCount === 0) {
    await prisma.reservedUsername.createMany({
      data: starterReserved.map((value) => ({
        value,
        category: ReservedNameCategory.SYSTEM,
        reason: "Bootstrap system name",
      })),
    });
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!username && !email && !password) {
    console.log("Seed complete. No bootstrap administrator requested.");
    return;
  }
  if (!username || !email || !password) {
    throw new Error("Set SEED_ADMIN_USERNAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD together.");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    console.log("Seed complete. Bootstrap administrator already exists.");
    return;
  }

  const usernameRules = {
    minLength: settingsRegistry["username.minLength"].defaultValue,
    maxLength: settingsRegistry["username.maxLength"].defaultValue,
    pattern: settingsRegistry["username.pattern"].defaultValue,
  };
  const reserved = await prisma.reservedUsername.findUnique({ where: { value: username } });
  const usernameIssue = validateUsername(username, usernameRules, Boolean(reserved));
  if (usernameIssue) {
    throw new Error(`Bootstrap username was rejected: ${usernameIssue}`);
  }
  const passwordIssue = validatePassword(
    password,
    settingsRegistry["security.passwordMinLength"].defaultValue,
  );
  if (passwordIssue) {
    throw new Error(`Bootstrap password was rejected: ${passwordIssue}`);
  }

  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  const cost = Number(process.env.BCRYPT_COST ?? 12);
  await prisma.user.create({
    data: {
      username,
      email,
      status: UserStatus.ACTIVE,
      locale: "ar",
      accounts: {
        create: {
          provider: "credentials",
          providerAccountId: email,
          passwordHash: await hash(password, Number.isInteger(cost) ? cost : 12),
        },
      },
      roles: { create: { roleId: superAdmin.id } },
    },
  });
  console.log(`Seed complete. Bootstrap administrator created: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
