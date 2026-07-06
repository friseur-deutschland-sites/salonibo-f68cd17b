"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import siteData from "../data/site-data.json";

const CAT_LABELS = { damen: "Damen", herren: "Herren", kinder: "Kinder", unisex: "Unisex" };
const CAT_ORDER = ["damen", "herren", "kinder", "unisex"];

export default function Leistungen() {
  const [services, setServices] = useState(null);

  useEffect(() => {
    fetch("/api/services")
      .then(r => r.json()).then(setServices).catch(() => setServices([]));
  }, []);

  const grouped = services
    ? CAT_ORDER.reduce((acc, cat) => {
        const list = services.filter(s => s.category === cat);
        if (list.length) acc[cat] = list;
        return acc;
      }, {})
    : {};

  return (
    <section id="leistungen" className="bg-cream py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-widest text-terra">Leistungen</p>
        <h2 className="mt-2 text-center font-display text-4xl font-semibold text-coffee">Unsere Angebote</h2>

        {!services ? (
          <p className="mt-12 text-center text-coffee/40">Wird geladen…</p>
        ) : services.length === 0 ? (
          <p className="mt-12 text-center text-coffee/40">Keine Leistungen eingetragen.</p>
        ) : (
          <div className="mt-12 space-y-10">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                <h3 className="mb-4 border-b border-coffee/10 pb-2 font-display text-lg font-semibold text-coffee">
                  {CAT_LABELS[cat] || cat}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between border border-coffee/10 bg-sand/40 px-4 py-3">
                      <span className="text-coffee">{svc.name_de}</span>
                      <div className="flex items-center gap-4 text-sm text-coffee/60">
                        <span>{svc.duration_minutes} Min.</span>
                        {svc.price_eur && <span className="font-semibold text-coffee">{Number(svc.price_eur).toFixed(2)} €</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/termin"
            className="inline-block bg-terra px-10 py-4 text-sm uppercase tracking-widest text-cream hover:bg-terradark transition-colors">
            {siteData.content.appointmentCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
