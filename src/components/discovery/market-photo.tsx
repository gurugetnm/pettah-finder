import Image from "next/image";
export function MarketPhoto({ hero = false }: { hero?: boolean }) {
  return (
    <figure className={hero ? "market-photo hero-photo" : "market-photo"}>
      <Image
        src="/images/pettah-market.webp"
        alt="Shopfronts, market stalls and shoppers on a street in Pettah, Colombo"
        fill
        sizes={
          hero
            ? "(max-width: 767px) 100vw, 50vw"
            : "(max-width: 767px) 100vw, 70vw"
        }
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : "auto"}
      />
      <figcaption>
        <span>
          Pettah, through a local lens{" "}
          <small>Neighbourhood photograph · 2007</small>
        </span>
        <a href="/image-credits">Photo credit ↗</a>
      </figcaption>
    </figure>
  );
}
