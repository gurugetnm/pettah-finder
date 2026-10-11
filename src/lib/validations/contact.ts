import { z } from "zod";
const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^\+?[0-9 ()-]+$/)
  .transform((value) => value.replace(/[ ()-]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/));
export function phoneHref(value: string | null) {
  const parsed = phoneSchema.safeParse(value);
  return parsed.success ? `tel:${parsed.data}` : null;
}
