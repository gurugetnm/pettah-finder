import { z } from "zod";
import { querySchema, slugSchema } from "./search";
export const shopFilterSchema = z.object({
  q: querySchema.optional().default(""),
  category: z.preprocess(
    (v) => (v === "" ? undefined : v),
    slugSchema.optional(),
  ),
  street: z.preprocess(
    (v) => (v === "" ? undefined : v),
    slugSchema.optional(),
  ),
});
