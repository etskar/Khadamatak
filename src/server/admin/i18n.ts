import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { writeAdminAudit } from "@/server/admin/guard";

export const ADMIN_LOCALES = ["ar", "nl"] as const;

function messagesPath(locale: string) {
  if (!ADMIN_LOCALES.includes(locale as (typeof ADMIN_LOCALES)[number])) {
    throw new Error("INVALID_LOCALE");
  }
  return path.join(process.cwd(), "messages", `${locale}.json`);
}

export async function getTranslationsIndex() {
  const out: Record<string, { ar: unknown; nl: unknown }> = {};
  const [ar, nl] = await Promise.all([
    fs.readFile(messagesPath("ar"), "utf-8").then((s) => JSON.parse(s)),
    fs.readFile(messagesPath("nl"), "utf-8").then((s) => JSON.parse(s)),
  ]);
  const arFlat = flatten(ar);
  const nlFlat = flatten(nl);

  for (const key of new Set([...Object.keys(arFlat), ...Object.keys(nlFlat)])) {
    out[key] = {
      ar: arFlat[key] ?? null,
      nl: nlFlat[key] ?? null,
    };
  }
  return out;
}

export async function getTranslationOverview() {
  const [ar, nl] = await Promise.all([
    fs.readFile(messagesPath("ar"), "utf-8").then((s) => JSON.parse(s)),
    fs.readFile(messagesPath("nl"), "utf-8").then((s) => JSON.parse(s)),
  ]);
  const arFlat = flatten(ar);
  const nlFlat = flatten(nl);
  const allKeys = Array.from(new Set([...Object.keys(arFlat), ...Object.keys(nlFlat)]));
  const missingAr = allKeys.filter((k) => arFlat[k] == null || arFlat[k] === "");
  const missingNl = allKeys.filter((k) => nlFlat[k] == null || nlFlat[k] === "");

  return {
    locales: [
      { locale: "ar", total: allKeys.length, complete: allKeys.length - missingAr.length, missing: missingAr.length },
      { locale: "nl", total: allKeys.length, complete: allKeys.length - missingNl.length, missing: missingNl.length },
    ],
    samples: missingNl.slice(0, 40),
  };
}

export async function translateMissingKeys(adminId: string) {
  const [ar, nl] = await Promise.all([
    fs.readFile(messagesPath("ar"), "utf-8").then((s) => JSON.parse(s)),
    fs.readFile(messagesPath("nl"), "utf-8").then((s) => JSON.parse(s)),
  ]);
  const arFlat = flatten(ar);
  const nlFlat = flatten(nl);

  let copied = 0;
  for (const key of Object.keys(arFlat)) {
    if (nlFlat[key] == null || nlFlat[key] === "") {
      setByPath(nl, key, String(arFlat[key]));
      copied++;
    }
  }
  if (copied > 0) {
    await fs.writeFile(messagesPath("nl"), JSON.stringify(nl, null, 2) + "\n", "utf-8");
  }

  await writeAdminAudit({
    adminId,
    action: "i18n.auto_translate",
    entityType: "i18n",
    entityId: "nl",
    newValue: { copied },
  });
  return { copied };
}

export async function updateTranslationKey(input: {
  adminId: string;
  locale: string;
  key: string;
  value: string;
}) {
  const filePath = messagesPath(input.locale);
  const file = JSON.parse(await fs.readFile(filePath, "utf-8"));

  let previousValue: unknown = null;
  const exists = keyExists(file, input.key);
  if (exists) previousValue = getByPath(file, input.key);

  setByPath(file, input.key, input.value);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2) + "\n", "utf-8");

  await writeAdminAudit({
    adminId: input.adminId,
    action: `i18n.${exists ? "update" : "create"}`,
    entityType: "i18n",
    entityId: `${input.locale}.${input.key}`,
    previousValue,
    newValue: input.value,
  });
  return { key: input.key, locale: input.locale, value: input.value };
}

export async function deleteTranslationKey(input: {
  adminId: string;
  locale: string;
  key: string;
}) {
  const filePath = messagesPath(input.locale);
  const file = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const previousValue = getByPath(file, input.key);
  if (previousValue === undefined) throw new Error("KEY_NOT_FOUND");

  deleteByPath(file, input.key);
  await fs.writeFile(filePath, JSON.stringify(file, null, 2) + "\n", "utf-8");

  await writeAdminAudit({
    adminId: input.adminId,
    action: "i18n.delete",
    entityType: "i18n",
    entityId: `${input.locale}.${input.key}`,
    previousValue,
    newValue: null,
  });
  return { ok: true };
}

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function getByPath(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function setByPath(obj: Record<string, unknown>, key: string, value: string) {
  const parts = key.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== "object") cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteByPath(obj: Record<string, unknown>, key: string) {
  const parts = key.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== "object") return;
    cur = cur[part] as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]];
}

function keyExists(obj: Record<string, unknown>, key: string) {
  return getByPath(obj, key) !== undefined;
}
