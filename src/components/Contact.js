import siteData from "../data/site-data.json";

export default function Contact() {
  const { salon, content } = siteData;
  const hours = salon.openingHours || {};
  const hasHours = Object.keys(hours).length > 0;

  return (
    <section id="kontakt" className="mx-auto max-w-5xl px-4 py-20">
      <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
        {content.contactHeading || "Kontakt"}
      </h2>
      <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />

      <div className={`mt-12 grid gap-10 ${hasHours ? "md:grid-cols-2" : "max-w-md mx-auto"}`}>
        <div className="rounded-2xl bg-sand/60 p-8">
          <h3 className="font-display text-xl font-bold">So finden Sie uns</h3>
          <ul className="mt-5 space-y-4 text-coffee/85">
            {salon.address && (
              <li className="flex gap-3">
                <span aria-hidden>📍</span>
                <span>{salon.address}</span>
              </li>
            )}
            {salon.phone && (
              <li className="flex gap-3">
                <span aria-hidden>📞</span>
                <a href={`tel:${salon.phone.replace(/\s/g, "")}`} className="hover:text-terra">
                  {salon.phone}
                </a>
              </li>
            )}
            {salon.email && (
              <li className="flex gap-3">
                <span aria-hidden>✉️</span>
                <a href={`mailto:${salon.email}`} className="hover:text-terra">
                  {salon.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        {hasHours && (
          <div className="rounded-2xl bg-sand/60 p-8">
            <h3 className="font-display text-xl font-bold">Öffnungszeiten</h3>
            <ul className="mt-5 space-y-2">
              {Object.entries(hours).map(([day, time]) => (
                <li key={day} className="flex justify-between gap-4 text-coffee/85">
                  <span>{day}</span>
                  <span className="font-medium">{String(time)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
