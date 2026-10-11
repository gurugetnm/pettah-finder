import Link from "next/link";
export const metadata = { title: "Image credits" };
export default function ImageCredits() {
  return (
    <div className="shell content-page">
      <div className="page-heading">
        <h1>Photography & map credits</h1>
        <p>Real places, with credit to the people who document them.</p>
      </div>
      <section className="detail-panel">
        <h2>Pettah street market</h2>
        <p>
          “Sri Lanka - 012 - Market street around Fort Stn & Harbour” by McKay
          Savage, photographed 15 October 2007. Used as historical neighbourhood
          context, not as a photograph of any named street or business.
        </p>
        <p className="mt-3">
          <a
            className="text-link"
            href="https://commons.wikimedia.org/wiki/File:Sri_Lanka_-_012_-_Market_street_around_Fort_Stn_%26_Harbour_(1630266755).jpg"
          >
            Original on Wikimedia Commons ↗
          </a>{" "}
          ·{" "}
          <a
            className="text-link"
            href="https://creativecommons.org/licenses/by/2.0/"
          >
            CC BY 2.0 ↗
          </a>
        </p>
        <p>
          Resized and converted to WebP; display crops vary with screen size.
        </p>
      </section>
      <section className="detail-panel">
        <h2>Street locations</h2>
        <p>
          Map data © OpenStreetMap contributors, available under the{" "}
          <a
            className="text-link"
            href="https://www.openstreetmap.org/copyright"
          >
            Open Database License
          </a>
          . Map points represent shopping streets, not exact shop entrances.
          Category associations remain preliminary.
        </p>
      </section>
      <section className="detail-panel">
        <h2>Shop listings</h2>
        <p>
          Some shop listings are derived from OpenStreetMap data © OpenStreetMap
          contributors, available under the{" "}
          <a
            className="text-link"
            href="https://www.openstreetmap.org/copyright"
          >
            Open Database License
          </a>
          . Each such listing names its source and links to the original record.
          A listing is shown only after review and independent verification of
          the business and its location.
        </p>
      </section>
      <Link className="text-link" href="/">
        Back to exploring →
      </Link>
    </div>
  );
}
