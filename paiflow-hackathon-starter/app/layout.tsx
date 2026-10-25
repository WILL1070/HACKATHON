import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "StayFlow — Book spaces, pay in XLM",
  description:
    "Demo booking marketplace on Stellar: hotels, vacation houses, lounges, conference rooms and study hubs, settled with the Paiflow SDK.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
