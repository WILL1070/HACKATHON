// Demo listings for the marketplace UI. Sample data only — no real bookings.
// Photos: verified-reachable Unsplash assets (checked Oct 2026).
export type ListingCategory =
  | "hotel"
  | "vacation-house"
  | "lounge"
  | "conference-room"
  | "study-hub"
  | "coffee-shop"
  | "internet-cafe";

/** A reservable unit of inventory (table, seat, or computer). */
export type ListingSeat = {
  id: string;
  label: string;
  kind: "table" | "seat" | "workspace" | "pc";
  specs?: string;
};

export type DemoListing = {
  id: string;
  title: string;
  category: ListingCategory;
  location: string;
  hostName: string;
  priceXlm: number;
  priceUnit: "night" | "hour";
  rating: number;
  reviews: number;
  guests: number;
  beds: number;
  tag?: string;
  imageUrl: string;
  description: string;
  /** Daily opening window in whole hours (24h clock), for time-slot validation. */
  openingHours?: { open: number; close: number; note?: string };
  amenities?: string[];
  /** Coffee shops: Wi-Fi offer, e.g. "Free · password at the counter". */
  wifi?: string;
  /** Coffee shops: power outlet availability. */
  powerOutlets?: string;
  /** Coffee shops: seating types on offer. */
  seatingTypes?: string[];
  /** Coffee shops: typical noise level. */
  noiseLevel?: "quiet" | "moderate" | "lively";
  /** Coffee shops: minimum spend per reservation, in XLM. */
  minSpendXlm?: number;
  /** Coffee shops: which reservation kinds the business offers. */
  reservationKinds?: ("table" | "seat" | "workspace")[];
  /** Internet cafés: baseline PC specification. */
  pcSpecs?: string;
  /** Internet cafés: gaming equipment available. */
  gamingEquipment?: string[];
  /** Internet cafés: verified downstream speed; omit if unverified. */
  verifiedSpeedMbps?: number;
  /** Reservable inventory. When present, bookings must pick one unit. */
  seats?: ListingSeat[];
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const CATEGORIES: {
  key: ListingCategory | "all";
  label: string;
  imageUrl: string;
}[] = [
  { key: "all", label: "All spaces", imageUrl: img("photo-1517502884422-41eaead166d4") },
  { key: "hotel", label: "Hotels", imageUrl: img("photo-1566073771259-6a8506099945") },
  { key: "vacation-house", label: "Vacation houses", imageUrl: img("photo-1493809842364-78817add7ffb") },
  { key: "lounge", label: "Lounges", imageUrl: img("photo-1517248135467-4c7edcad34c4") },
  { key: "conference-room", label: "Conference rooms", imageUrl: img("photo-1431540015161-0bf868a2d407") },
  { key: "study-hub", label: "Study hubs", imageUrl: img("photo-1507842217343-583bb7270b66") },
  { key: "coffee-shop", label: "Coffee shops", imageUrl: img("photo-1445116572660-236099ec97a0") },
  { key: "internet-cafe", label: "Internet cafés", imageUrl: img("photo-1598550476439-6847785fcea6") },
];

export const HERO_IMAGE_URL = img("photo-1571260899304-425eee4c7efc");
export const HERO_IMAGE_SECONDARY_URL = img("photo-1582719478250-c89cae4dc85b");

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "azure-pearl-hotel",
    title: "Azure Pearl Hotel",
    category: "hotel",
    location: "Marina Bay, Singapore",
    hostName: "Pearl Hospitality Group",
    priceXlm: 12,
    priceUnit: "night",
    rating: 4.9,
    reviews: 318,
    guests: 2,
    beds: 1,
    tag: "Guest favourite",
    imageUrl: img("photo-1566073771259-6a8506099945"),
    description:
      "A serene rooftop pool, skyline views and quiet, well-appointed rooms in the heart of Marina Bay. Breakfast is served on the 18th floor.",
  },
  {
    id: "cliffside-glass-villa",
    title: "Cliffside Glass Villa",
    category: "vacation-house",
    location: "Santorini, Greece",
    hostName: "Elena",
    priceXlm: 45,
    priceUnit: "night",
    rating: 5.0,
    reviews: 87,
    guests: 6,
    beds: 3,
    tag: "Superhost",
    imageUrl: img("photo-1582719478250-c89cae4dc85b"),
    description:
      "Floor-to-ceiling glass above the caldera, a private plunge pool and sunset terraces. Sleeps six across three bedrooms.",
  },
  {
    id: "velvet-lounge-soho",
    title: "The Velvet Lounge",
    category: "lounge",
    location: "Soho, New York",
    hostName: "Maven Spaces",
    priceXlm: 8,
    priceUnit: "hour",
    rating: 4.8,
    reviews: 203,
    guests: 12,
    beds: 0,
    tag: "Guest favourite",
    imageUrl: img("photo-1517248135467-4c7edcad34c4"),
    description:
      "Plush seating, warm low light and a vinyl library — a members'-club feel for private gatherings up to twelve.",
  },
  {
    id: "summit-boardroom",
    title: "Summit Boardroom",
    category: "conference-room",
    location: "Canary Wharf, London",
    hostName: "Foundry Workspaces",
    priceXlm: 15,
    priceUnit: "hour",
    rating: 4.7,
    reviews: 156,
    guests: 20,
    beds: 0,
    imageUrl: img("photo-1497366216548-37526070297c"),
    description:
      "A 20-seat boardroom with dual displays, video conferencing and a skyline view over the docks. Coffee and tea included.",
  },
  {
    id: "lantern-study-hub",
    title: "Lantern Study Hub",
    category: "study-hub",
    location: "Gion, Kyoto",
    hostName: "Hikari Co.",
    priceXlm: 2,
    priceUnit: "hour",
    rating: 4.9,
    reviews: 412,
    guests: 1,
    beds: 0,
    tag: "Superhost",
    imageUrl: img("photo-1524995997946-a1c2e315a42f"),
    description:
      "Silent tatami alcoves, warm lantern light and bottomless matcha. Individual focus desks with lockable storage.",
  },
  {
    id: "casa-verde-retreat",
    title: "Casa Verde Retreat",
    category: "vacation-house",
    location: "Tulum, Mexico",
    hostName: "Diego & Maria",
    priceXlm: 28,
    priceUnit: "night",
    rating: 4.8,
    reviews: 141,
    guests: 8,
    beds: 4,
    imageUrl: img("photo-1493809842364-78817add7ffb"),
    description:
      "A plant-filled courtyard house with a stone plunge pool, outdoor kitchen and four airy bedrooms near the beach road.",
  },
  {
    id: "aurora-grand-hotel",
    title: "Aurora Grand Hotel",
    category: "hotel",
    location: "Reykjavík, Iceland",
    hostName: "Nordic Stays",
    priceXlm: 18,
    priceUnit: "night",
    rating: 4.6,
    reviews: 264,
    guests: 2,
    beds: 1,
    imageUrl: img("photo-1542314831-068cd1dbfeeb"),
    description:
      "Geothermal spa access, northern-lights wake-up calls and a fire-lit lobby bar. Quiet rooms with heated floors.",
  },
  {
    id: "neon-sky-lounge",
    title: "Neon Sky Lounge",
    category: "lounge",
    location: "Dubai Marina, UAE",
    hostName: "Meridian Venues",
    priceXlm: 11,
    priceUnit: "hour",
    rating: 4.7,
    reviews: 98,
    guests: 16,
    beds: 0,
    tag: "New",
    imageUrl: img("photo-1571896349842-33c89424de2d"),
    description:
      "A 61st-floor terrace lounge overlooking the marina. Hire includes a private bar team and ambient lighting control.",
  },
  {
    id: "founders-conference-suite",
    title: "Founders Conference Suite",
    category: "conference-room",
    location: "SoMa, San Francisco",
    hostName: "Basecamp Offices",
    priceXlm: 20,
    priceUnit: "hour",
    rating: 4.9,
    reviews: 175,
    guests: 30,
    beds: 0,
    tag: "Guest favourite",
    imageUrl: img("photo-1431540015161-0bf868a2d407"),
    description:
      "A loft-style suite for offsites and launches: stage lighting, 30 seats, demo wall and an espresso bar in the back.",
  },
  {
    id: "the-quiet-stack",
    title: "The Quiet Stack",
    category: "study-hub",
    location: "Mitte, Berlin",
    hostName: "Tiefblau GmbH",
    priceXlm: 3,
    priceUnit: "hour",
    rating: 4.8,
    reviews: 229,
    guests: 1,
    beds: 0,
    imageUrl: img("photo-1507842217343-583bb7270b66"),
    description:
      "Floor-to-ceiling shelves, desk lamps and a strict quiet policy across three floors of shared and private study rooms.",
  },
  {
    id: "ember-and-oak",
    title: "Ember & Oak Coffee",
    category: "coffee-shop",
    location: "Kreuzberg, Berlin",
    hostName: "Sofia",
    priceXlm: 1.5,
    priceUnit: "hour",
    rating: 4.8,
    reviews: 167,
    guests: 4,
    beds: 0,
    tag: "Guest favourite",
    imageUrl: img("photo-1445116572660-236099ec97a0"),
    description:
      "A wood-and-brick neighbourhood café with single-origin pour-overs, a long communal oak table and a laptop-friendly mezzanine. Reserve a table, a window seat or a mezzanine workspace.",
    openingHours: { open: 8, close: 19, note: "Kitchen closes at 18:00" },
    amenities: ["Espresso bar", "Pastries", "Filter coffee", "Meeting nook"],
    wifi: "Free · password on your receipt",
    powerOutlets: "At every table and along the window bench",
    seatingTypes: ["Communal table", "Window seats", "Mezzanine workspace"],
    noiseLevel: "moderate",
    minSpendXlm: 2,
    reservationKinds: ["table", "seat", "workspace"],
    seats: [
      { id: "t1", label: "Communal table (seats 4)", kind: "table" },
      { id: "w1", label: "Window seat 1", kind: "seat" },
      { id: "w2", label: "Window seat 2", kind: "seat" },
      { id: "m1", label: "Mezzanine workspace", kind: "workspace", specs: "24\" monitor hookup, desk lamp" },
    ],
  },
  {
    id: "kopi-tigapuluh",
    title: "Kopi Tigapuluh",
    category: "coffee-shop",
    location: "Braga, Bandung",
    hostName: "Raka",
    priceXlm: 1,
    priceUnit: "hour",
    rating: 4.9,
    reviews: 243,
    guests: 2,
    beds: 0,
    tag: "New",
    imageUrl: img("photo-1554118811-1e0d58224f24"),
    description:
      "A quiet Dutch-colonial courtyard café specialising in Indonesian single origins. Low music, no calls indoors — ideal for focused work over a slow cup.",
    openingHours: { open: 7, close: 22 },
    amenities: ["Single-origin bar", "Courtyard garden", "Cold brew on tap"],
    wifi: "Free · 100 Mbps fibre",
    powerOutlets: "Two sockets per table",
    seatingTypes: ["Two-seater tables", "Courtyard benches"],
    noiseLevel: "quiet",
    reservationKinds: ["table"],
    seats: [
      { id: "a1", label: "Courtyard table 1", kind: "table" },
      { id: "a2", label: "Courtyard table 2", kind: "table" },
      { id: "i1", label: "Indoor table 1", kind: "table" },
      { id: "i2", label: "Indoor table 2", kind: "table" },
    ],
  },
  {
    id: "pixel-guild",
    title: "Pixel Guild Internet Café",
    category: "internet-cafe",
    location: "Akihabara, Tokyo",
    hostName: "Kenji",
    priceXlm: 2.5,
    priceUnit: "hour",
    rating: 4.7,
    reviews: 389,
    guests: 1,
    beds: 0,
    tag: "Guest favourite",
    imageUrl: img("photo-1598550476439-6847785fcea6"),
    description:
      "Twenty high-refresh gaming rigs and six quiet work PCs on a 2 Gbps line. Book a specific station for ranked nights or focused work — gaming gear listed per seat.",
    openingHours: { open: 10, close: 2, note: "Open daily 10:00–02:00" },
    amenities: ["Snack bar", "Energy drinks", "Locker rental", "Tournament corner"],
    pcSpecs: "RTX 4070 · 32 GB RAM · 240 Hz monitors (gaming) · i5/16 GB (work PCs)",
    gamingEquipment: ["Mechanical keyboards", "Pro mice", "Headsets", "Racing seat (station G1)"],
    verifiedSpeedMbps: 2000,
    seats: [
      { id: "g1", label: "Gaming station 1", kind: "pc", specs: "240 Hz · racing seat" },
      { id: "g2", label: "Gaming station 2", kind: "pc", specs: "240 Hz" },
      { id: "g3", label: "Gaming station 3", kind: "pc", specs: "240 Hz" },
      { id: "w1", label: "Work PC 1", kind: "pc", specs: "Quiet zone" },
      { id: "w2", label: "Work PC 2", kind: "pc", specs: "Quiet zone" },
    ],
  },
  {
    id: "lagoon-esports-lounge",
    title: "Lagoon Esports Lounge",
    category: "internet-cafe",
    location: "Makati, Manila",
    hostName: "Marco",
    priceXlm: 2,
    priceUnit: "hour",
    rating: 4.6,
    reviews: 214,
    guests: 1,
    beds: 0,
    imageUrl: img("photo-1542751371-adc38448a05e"),
    description:
      "Twelve stations on a low-latency fibre connection with a console corner and regular community nights. Hourly rates, book any open station.",
    openingHours: { open: 12, close: 24, note: "Weekends from 09:00" },
    amenities: ["Console corner", "Fried snacks", "Drink refills"],
    pcSpecs: "RTX 3060 · 16 GB RAM · 144 Hz monitors",
    gamingEquipment: ["Gamepads", "Headsets"],
    seats: [
      { id: "s1", label: "Station 1", kind: "pc" },
      { id: "s2", label: "Station 2", kind: "pc" },
      { id: "s3", label: "Station 3", kind: "pc" },
      { id: "s4", label: "Station 4", kind: "pc" },
    ],
  },
];

export function getDemoListing(id: string): DemoListing | undefined {
  return DEMO_LISTINGS.find((listing) => listing.id === id);
}

export function categoryLabel(key: ListingCategory): string {
  return (
    CATEGORIES.find((c) => c.key === key)?.label ??
    key.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  );
}
