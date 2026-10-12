import { Footer } from "@/components/layout/footer";
// Directory pages scroll and end with the footer; the map-first home page fills the viewport instead.
export default function DirectoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
