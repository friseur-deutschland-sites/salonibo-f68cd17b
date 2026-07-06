"use client";
import { useState, useEffect } from "react";

/** Galeri — salon sahibi admin panelinden yönetir (site_images: gallery_1..10). */
export default function Gallery() {
  const [images, setImages] = useState(null);
  const [lightbox, setLightbox] = useState(null); // index | null

  useEffect(() => {
    fetch("/api/site-images")
      .then(r => r.json())
      .then(d => setImages(d.gallery || []))
      .catch(() => setImages([]));
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox(i => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setLightbox(i => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images]);

  if (!images || images.length === 0) return null;

  return (
    <section id="galerie" className="py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-widest text-terra">Galerie</p>
        <h2 className="mt-2 text-center font-display text-4xl font-semibold text-coffee">Unsere Arbeiten</h2>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((url, i) => (
            <button key={i} onClick={() => setLightbox(i)}
              className={`group relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
              <img src={url} alt={`Galerie ${i + 1}`} loading="lazy"
                className="h-full w-full object-cover aspect-square transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-coffee/0 transition-colors group-hover:bg-coffee/20" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee/90 p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute right-5 top-5 text-3xl text-cream/80 hover:text-cream" aria-label="Schließen">✕</button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + images.length) % images.length); }}
                className="absolute left-3 text-4xl text-cream/60 hover:text-cream px-3" aria-label="Zurück">‹</button>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % images.length); }}
                className="absolute right-3 text-4xl text-cream/60 hover:text-cream px-3" aria-label="Weiter">›</button>
            </>
          )}
          <img src={images[lightbox]} alt="" className="max-h-[85vh] max-w-full object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
