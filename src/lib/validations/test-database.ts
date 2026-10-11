export function testDatabaseUrl(
  value: string | undefined,
  developmentUrl?: string,
) {
  if (!value)
    throw new Error(
      "TEST_DATABASE_URL is required; tests never fall back to DATABASE_URL.",
    );
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !/^\/[a-z0-9_]+_test$/.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Tests require a local PostgreSQL database with a name ending in _test and no URL options.",
    );
  if (developmentUrl) {
    const dev = new URL(developmentUrl);
    if (
      ["localhost", "127.0.0.1", "[::1]"].includes(dev.hostname) &&
      (url.port || "5432") === (dev.port || "5432") &&
      url.pathname === dev.pathname
    )
      throw new Error(
        "Test database must differ from the development database.",
      );
  }
  return value;
}
