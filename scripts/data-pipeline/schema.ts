import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z.iso.datetime({ offset: true });

export const boundarySchema = z
  .object({
    name: text(200),
    bbox: z.object({
      south: z.number().min(-90).max(90),
      west: z.number().min(-180).max(180),
      north: z.number().min(-90).max(90),
      east: z.number().min(-180).max(180),
    }),
    authoritative: z.boolean(),
    source: text(2000),
    safetyMarginMetres: z.number().min(0).max(200),
    validatedAt: z.iso.date(),
    notes: z.string().max(2000).optional(),
  })
  .refine((b) => b.bbox.south < b.bbox.north && b.bbox.west < b.bbox.east, {
    message: "bbox south/west must be below north/east",
  })
  // Guard against silently broadening the query beyond a neighbourhood.
  .refine(
    (b) =>
      b.bbox.north - b.bbox.south < 0.05 && b.bbox.east - b.bbox.west < 0.05,
    { message: "bbox is larger than a neighbourhood; review before widening" },
  );
export type Boundary = z.infer<typeof boundarySchema>;

export const sourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    name: text(200),
    url: z.url({ protocol: /^https$/ }),
    type: z.enum(["osm", "file", "directory"]),
    license: z.string().max(200),
    permissionStatus: z.enum(["APPROVED", "PERMISSION_REQUIRED", "DENIED"]),
    permissionEvidence: z.string().max(4000),
    attribution: z.string().max(500),
    attributionUrl: z.url({ protocol: /^https$/ }).optional(),
    reviewedAt: z.iso.date(),
    geographicScope: text(500),
    allowedFields: z.array(z.string().max(40)).max(30),
    publicationPermitted: z.boolean(),
    automatedCollection: z.boolean(),
    allowedEndpoints: z
      .array(z.url({ protocol: /^https$/ }))
      .max(5)
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((s, ctx) => {
    if (s.permissionStatus !== "APPROVED") return;
    for (const key of ["license", "permissionEvidence"] as const)
      if (!s[key].trim())
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `APPROVED source needs ${key}`,
        });
    if (s.publicationPermitted && !s.attribution.trim())
      ctx.addIssue({
        code: "custom",
        path: ["attribution"],
        message: "publishable source needs attribution text",
      });
  });
export type Source = z.infer<typeof sourceSchema>;
export const sourcesFileSchema = z.object({
  sources: z.array(z.unknown()).max(50),
});

export const LOCATION_PRECISION = [
  "exact",
  "representative",
  "approximate",
  "unknown",
] as const;

export const candidateSchema = z.object({
  id: text(120),
  source: z.string().regex(/^[a-z0-9-]{1,40}$/),
  sourceRecordId: text(80),
  sourceUrl: z.url({ protocol: /^https$/ }).optional(),
  name: text(160),
  normalizedName: text(160),
  streetName: text(160).optional(),
  normalizedStreetName: text(160).optional(),
  streetSlug: z.string().max(80).optional(),
  address: text(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  categories: z.array(z.string().max(80)).max(10),
  products: z.array(z.string().max(80)).max(0), // never inferred from a category
  contactPhone: z
    .string()
    .regex(/^\+94[0-9]{9}$/)
    .optional(),
  contactPhoneRaw: z.string().max(100).optional(),
  website: z
    .url({ protocol: /^https?$/ })
    .max(300)
    .optional(),
  openingHours: text(300).optional(),
  locationPrecision: z.enum(LOCATION_PRECISION),
  collectedAt: isoDate,
  flags: z.array(z.string().max(60)).max(20),
  rawTags: z.record(z.string().max(100), z.string().max(1000)).optional(),
  provenance: z.object({
    sourceLicense: text(200),
    attribution: z.string().max(500).optional(),
    originalRecordReference: text(300),
    sourceDatasetVersion: z.string().max(100).optional(),
  }),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const decisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    // Independent evidence (site visit, owner confirmation) is separate from approval.
    independentlyVerified: z.boolean(),
    evidence: z.string().max(1000).optional(),
    streetSlug: z.string().max(80).optional(),
    categories: z.array(z.string().max(80)).max(10).optional(),
    duplicateResolution: z.enum(["distinct"]).optional(),
    notes: z.string().max(2000).optional(),
    reviewer: text(100),
    reviewedAt: isoDate,
  })
  .refine((d) => !d.independentlyVerified || !!d.evidence?.trim(), {
    message: "independentlyVerified requires evidence",
  });
export type Decision = z.infer<typeof decisionSchema>;
export const decisionsFileSchema = z.object({
  decisions: z.record(z.string().max(120), decisionSchema),
});
