// A name-based destination does not claim a verified coordinate or business address.
export function directionsUrl(destination: string) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "destination",
    `${destination}, Pettah, Colombo, Sri Lanka`,
  );
  return url.href;
}
