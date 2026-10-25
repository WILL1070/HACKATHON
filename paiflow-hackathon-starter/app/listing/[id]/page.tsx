import { getDemoListing } from "@/lib/demo-listings";
import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";
import { ListingDetails } from "@/components/marketplace/listing-details";

export const dynamic = "force-dynamic";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = getDemoListing(id);

  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        {listing ? (
          <ListingDetails listing={listing} />
        ) : (
          <div className="sf-simple">
            <p className="sf-simple-emoji" aria-hidden="true">
              🧭
            </p>
            <h1>Listing not found</h1>
            <p>
              This demo listing does not exist. Browse the marketplace to find
              a space.
            </p>
            <a href="/#explore" className="sf-btn sf-btn-primary sf-btn-sm">
              Explore spaces
            </a>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
