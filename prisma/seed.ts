import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeText } from "../src/lib/validations/search";
import { categories, products, streets } from "./seed-data";
export async function seed(db: PrismaClient) {
  await db.$transaction(
    async (tx) => {
      for (const [slug, name, description, iconKey] of categories) {
        const data = { name, description, iconKey };
        await tx.category.upsert({
          where: { slug },
          create: { id: slug, slug, ...data },
          update: data,
        });
      }
      for (const [slug, name, description, categorySlugs] of streets) {
        const data = {
          name,
          description,
          locationDescription:
            "Pettah, Colombo. Exact location and category associations await independent verification.",
        };
        const street = await tx.street.upsert({
          where: { slug },
          create: { id: slug, slug, ...data },
          update: data,
        });
        for (const categorySlug of categorySlugs) {
          const category = await tx.category.findUniqueOrThrow({
            where: { slug: categorySlug },
          });
          await tx.streetCategory.upsert({
            where: {
              streetId_categoryId: {
                streetId: street.id,
                categoryId: category.id,
              },
            },
            create: { streetId: street.id, categoryId: category.id },
            update: {},
          });
        }
      }
      for (const [slug, name, categorySlug, aliases] of products) {
        const category = await tx.category.findUniqueOrThrow({
          where: { slug: categorySlug },
        });
        const data = { name, categoryId: category.id };
        const product = await tx.product.upsert({
          where: { slug },
          create: { id: slug, slug, ...data },
          update: data,
        });
        for (const alias of aliases) {
          const normalizedAlias = normalizeText(alias);
          await tx.productAlias.upsert({
            where: {
              productId_normalizedAlias: {
                productId: product.id,
                normalizedAlias,
              },
            },
            create: {
              id: `${slug}:${normalizedAlias}`,
              productId: product.id,
              alias,
              normalizedAlias,
            },
            update: { alias },
          });
        }
      }
    },
    { timeout: 30000 },
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = process.env.DATABASE_URL;
  if (
    !url ||
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
    !/^\/pettah_(dev|test)$/.test(new URL(url).pathname)
  )
    throw new Error(
      "Development seed requires local pettah_dev or pettah_test database and non-production environment.",
    );
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  seed(db)
    .then(() =>
      console.log(
        "Seeded preliminary discovery data; no shops or coordinates created.",
      ),
    )
    .catch(() => {
      console.error("Seed failed. Check database setup.");
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
