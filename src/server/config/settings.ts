import "server-only";
import { cache } from "react";
import { SettingValueType } from "@/generated/prisma/client";
import {
  FEATURE_KEYS,
  SETTING_GROUPS,
  SETTING_KEYS,
  type FeatureKey,
  type SettingGroup,
  type SettingKey,
  featureRegistry,
  settingsRegistry,
} from "@/server/config/registry";
import { coerceStoredSetting, type SettingValue, type StoredSettingValue } from "@/server/config/parse-setting";
import { getDb } from "@/server/db";

const valueTypeFor = {
  string: SettingValueType.STRING,
  number: SettingValueType.NUMBER,
  stringArray: SettingValueType.JSON,
  socialLinks: SettingValueType.JSON,
} as const;

export const getSettingMap = cache(async () => {
  const rows = await getDb().setting.findMany();
  return new Map(rows.map((row) => [row.key, row.value]));
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const stored = (await getSettingMap()).get(key);
  if (stored === undefined) return settingsRegistry[key].defaultValue as SettingValue<K>;
  return coerceStoredSetting(key, stored);
}

export async function getSettingsForGroup(group: SettingGroup) {
  const map = await getSettingMap();
  return SETTING_KEYS.filter((key) => settingsRegistry[key].group === group).map((key) => ({
    key,
    definition: settingsRegistry[key],
    value: (map.has(key)
      ? coerceStoredSetting(key, map.get(key))
      : settingsRegistry[key].defaultValue) as StoredSettingValue,
  }));
}

export function settingValueType(key: SettingKey) {
  return valueTypeFor[settingsRegistry[key].type];
}

export const getFeatureMap = cache(async () => {
  const rows = await getDb().featureFlag.findMany();
  return new Map(rows.map((row) => [row.key, row.enabled]));
});

export async function isFeatureEnabled(key: FeatureKey) {
  const definition = featureRegistry[key];
  if (!definition.implemented) return false;
  const stored = (await getFeatureMap()).get(key);
  return stored ?? definition.defaultEnabled;
}

export async function listFeatureFlags() {
  const stored = await getFeatureMap();
  return FEATURE_KEYS.map((key) => {
    const definition = featureRegistry[key];
    return {
      key,
      implemented: definition.implemented,
      locked: definition.locked === true,
      enabled: definition.implemented ? (stored.get(key) ?? definition.defaultEnabled) : false,
    };
  });
}

export const settingGroups = SETTING_GROUPS;
