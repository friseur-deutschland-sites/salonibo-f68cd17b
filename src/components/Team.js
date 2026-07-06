"use client";
import { useState, useEffect } from "react";

const GENDER_LABELS = { damen: "Damenspezialist", herren: "Herrenspezialist", beide: "Damen & Herren" };

export default function Team() {
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    fetch("/api/staff")
      .then(r => r.json()).then(setStaff).catch(() => setStaff([]));
  }, []);

  if (!staff || staff.length === 0) return null;

  return (
    <section id="team" className="bg-sand/30 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-widest text-terra">Team</p>
        <h2 className="mt-2 text-center font-display text-4xl font-semibold text-coffee">Unser Team</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map(m => (
            <div key={m.id} className="group relative flex flex-col items-center text-center">
              {m.photo_url ? (
                <img src={m.photo_url} alt={m.name} className="h-28 w-28 rounded-full object-cover" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-terra/10">
                  <span className="font-display text-4xl text-terra">{m.name[0]}</span>
                </div>
              )}
              <h3 className="mt-4 font-display text-xl font-semibold text-coffee">{m.name}</h3>
              <p className="mt-1 text-sm text-coffee/50">{GENDER_LABELS[m.gender_type] || m.gender_type}</p>

              {/* Mobil: bio doğrudan görünür */}
              {m.bio && <p className="mt-2 text-xs text-coffee/50 leading-relaxed sm:hidden">{m.bio}</p>}

              {/* Masaüstü: hover bilgi kartı */}
              {m.bio && (
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 sm:group-hover:block">
                  <div className="mx-auto h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-coffee" />
                  <div className="bg-coffee p-4 text-left text-xs leading-relaxed text-cream shadow-xl">
                    {m.bio}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
