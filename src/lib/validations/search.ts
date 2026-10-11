import { z } from "zod";
export function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en");
}
export const querySchema = z
  .string()
  .max(80, "Use 80 characters or fewer.")
  .refine((v) => !/[\u0000-\u001f\u007f]/u.test(v), "Use printable characters.")
  .transform(normalizeText);
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export function parseQuery(value: unknown) {
  return querySchema.safeParse(value === undefined ? "" : value);
}
