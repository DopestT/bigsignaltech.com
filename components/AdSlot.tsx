"use client";

import { useEffect, useState } from "react";

const houseAds = [
  { brand: "Let Me Teach You AI", headline: "Turn an idea into something real with AI.", body: "Learn AI by building. Start with an idea.", cta: "Start learning", href: "https://letmeteachyouai.com", background: "#08111f", accent: "#38bdf8" },
  { brand: "Perception", headline: "The front door to imagination.", body: "Take an idea from thought to action.", cta: "Perceive it", href: "https://perceptionai.io", background: "#050505", accent: "#f59e0b" },
];

type HouseAd = (typeof houseAds)[number];

export default function AdSlot() {
  const [houseAd, setHouseAd] = useState<HouseAd | null>(null);

  useEffect(() => {
    if (Math.random() < 0.1) setHouseAd(houseAds[Math.floor(Math.random() * houseAds.length)]);
  }, []);

  if (!houseAd) return <div className="ad-wrap" aria-label="Advertisement"><div className="ad-label">Advertisement</div><div className="ad-slot" data-commercial-ad="true">Advertisement</div></div>;
  return (
    <div className="ad-wrap"><div className="ad-label">From our network</div>
      <a className="house-ad" href={houseAd.href} target="_blank" rel="noopener noreferrer sponsored" style={{ background: houseAd.background }}>
        <span><span className="house-ad-brand">{houseAd.brand}</span><span className="house-ad-headline" style={{ display: "block" }}>{houseAd.headline}</span><span className="house-ad-body" style={{ display: "block" }}>{houseAd.body}</span></span>
        <span className="house-ad-cta" style={{ background: houseAd.accent, color: "#06111f" }}>{houseAd.cta}</span>
      </a>
    </div>
  );
}
