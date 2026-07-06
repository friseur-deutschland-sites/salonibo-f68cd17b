import siteData from "../data/site-data.json";

const links = [
  { href: "/#ueber-uns", label: "Über uns" },
  { href: "/#leistungen", label: "Leistungen" },
  { href: "/#team", label: "Team" },
  { href: "/#kontakt", label: "Kontakt" },
];

export default function Navbar() {
  const { salon, images } = siteData;
  return (
    <header className="sticky top-0 z-50 border-b border-coffee/10 bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2">
          {images?.logo
            ? <img src={images.logo} alt={salon.name} className="h-9 w-auto max-w-[120px] object-contain"/>
            : <span className="font-display text-xl font-bold tracking-tight">{salon.name}</span>
          }
        </a>
        <ul className="flex items-center gap-5 text-sm sm:gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-terra/70">
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/termin"
              className="bg-terra px-5 py-2.5 text-sm text-cream transition-colors hover:bg-terradark"
            >
              Termin buchen
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
