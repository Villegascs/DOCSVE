"use client";

const SPONSORS = [
  { name: 'Villegas', src: '/Logos/sponsors/logo-villegas.png', alt: 'Villegas' },
  { name: 'Creativos Criollos', src: '/Logos/sponsors/creativos-criollos.png', alt: 'Creativos Criollos' },
  { name: 'Xtreme Audiovisuales', src: '/Logos/sponsors/xtreme-audiovisuales.png', alt: 'Xtreme Audiovisuales' },
  { name: 'Luna Candles', src: '/Logos/sponsors/luna-candles.png', alt: 'Luna Candles' }
];

export default function SponsorsTicker() {
  // Repetir el array para garantizar un desplazamiento infinito continuo y fluido
  const repeatedSponsors = [...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS];

  return (
    <section className="sponsors-ticker-wrapper" aria-label="Sponsors y Aliados">
      <div className="sponsors-ticker-track">
        <div className="sponsors-ticker-group">
          {repeatedSponsors.map((sponsor, index) => (
            <div key={`sponsor-track1-${index}`} className="sponsors-ticker-item">
              <img
                src={sponsor.src}
                alt={sponsor.alt}
                className="sponsors-ticker-logo"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <div className="sponsors-ticker-group" aria-hidden="true">
          {repeatedSponsors.map((sponsor, index) => (
            <div key={`sponsor-track2-${index}`} className="sponsors-ticker-item">
              <img
                src={sponsor.src}
                alt={sponsor.alt}
                className="sponsors-ticker-logo"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
