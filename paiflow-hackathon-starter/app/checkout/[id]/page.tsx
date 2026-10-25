import { getDemoListing } from "@/lib/demo-listings";
import { applyPromotion } from "@/lib/promotions";
import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";
import { CheckoutPayment } from "@/components/marketplace/checkout-payment";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const listing = getDemoListing(id);

  if (!listing) {
    return (
      <div className="sf-page">
        <Navbar />
        <main className="sf-main">
          <div className="sf-simple">
            <p className="sf-simple-emoji" aria-hidden="true">
              🧭
            </p>
            <h1>Booking not found</h1>
            <p>This demo booking does not exist.</p>
            <a href="/#explore" className="sf-btn sf-btn-primary sf-btn-sm">
              Explore spaces
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const checkIn = single(query.checkIn) ?? "";
  const checkOut = single(query.checkOut) ?? "";
  const guests = single(query.guests) ?? "1";
  const units = Math.max(1, Number(single(query.units)) || 1);
  const resourceId = single(query.resource) ?? "";
  const startHour = Number(single(query.start));
  const hasSlot = !!resourceId && Number.isInteger(startHour);
  const priced = applyPromotion(listing, units, checkIn || new Date().toISOString().slice(0, 10));
  const unitLabel =
    listing.priceUnit === "night"
      ? `${units} ${units === 1 ? "night" : "nights"}`
      : `${units} ${units === 1 ? "hour" : "hours"}`;

  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <div className="sf-checkout">
          <div className="sf-checkout-summary">
            <img src={listing.imageUrl} alt={listing.title} />
            <div className="sf-checkout-summary-body">
              <h2>{listing.title}</h2>
              <p className="sf-muted">{listing.location}</p>
              <dl className="sf-confirm-rows" style={{ marginTop: 16 }}>
                <div className="sf-confirm-row">
                  <dt>Dates</dt>
                  <dd>
                    {checkIn && checkOut
                      ? `${checkIn} → ${checkOut}`
                      : "Selected at check-in"}
                  </dd>
                </div>
                <div className="sf-confirm-row">
                  <dt>Guests</dt>
                  <dd>{guests}</dd>
                </div>
                <div className="sf-confirm-row">
                  <dt>Duration</dt>
                  <dd>{unitLabel}</dd>
                </div>
                {hasSlot && (
                  <>
                    <div className="sf-confirm-row">
                      <dt>Time</dt>
                      <dd>
                        {String(startHour).padStart(2, "0")}:00 –{" "}
                        {String((startHour + units) % 24).padStart(2, "0")}:00
                      </dd>
                    </div>
                    <div className="sf-confirm-row">
                      <dt>Unit</dt>
                      <dd>
                        {
                          listing.seats?.find((s) => s.id === resourceId)
                            ?.label ?? resourceId
                        }
                      </dd>
                    </div>
                  </>
                )}
                <div className="sf-confirm-row">
                  <dt>Host</dt>
                  <dd>{listing.hostName} (demo)</dd>
                </div>
                <div className="sf-confirm-row">
                  <dt>Rate</dt>
                  <dd>
                    {listing.priceXlm} XLM / {listing.priceUnit}
                  </dd>
                </div>
                {priced.promotion && priced.discountXlm > 0 ? (
                  <>
                    <div className="sf-confirm-row">
                      <dt>Subtotal</dt>
                      <dd style={{ textDecoration: "line-through" }}>
                        {priced.originalXlm} XLM
                      </dd>
                    </div>
                    <div className="sf-confirm-row">
                      <dt>{priced.promotion.label}</dt>
                      <dd>−{priced.discountXlm} XLM</dd>
                    </div>
                  </>
                ) : null}
                <div className="sf-confirm-row">
                  <dt>Total (demo)</dt>
                  <dd>{priced.finalXlm} XLM</dd>
                </div>
              </dl>
              <p className="sf-fineprint" style={{ textAlign: "left" }}>
                Demo booking — sample data. The on-chain payment is prepared
                for exactly this total; the booking is marked paid only after
                the transaction and the received amount are verified.
              </p>
            </div>
          </div>
          <CheckoutPayment
            listingId={listing.id}
            checkIn={checkIn}
            checkOut={hasSlot ? checkIn : checkOut}
            guests={Number(guests) || 1}
            units={units}
            resourceId={hasSlot ? resourceId : undefined}
            startHour={hasSlot ? startHour : undefined}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
