"use client";

const SPONSORS = [
  {
    name: 'Villegas',
    src: '/Logos/sponsors/logo-villegas.png',
    alt: 'Villegas',
    url: 'https://www.instagram.com/villegapics/'
  },
  {
    name: 'Creativos Criollos',
    src: '/Logos/sponsors/creativos-criollos.png',
    alt: 'Creativos Criollos',
    url: 'https://www.instagram.com/creativocriollo/'
  },
  {
    name: 'Jardín el Paraíso',
    src: '/Logos/sponsors/logo-jardin.png',
    alt: 'Jardín el Paraíso',
    url: 'https://www.instagram.com/jardinelparaiso/'
  },
  {
    name: 'Velada',
    src: '/Logos/sponsors/logo-velada.png',
    alt: 'Velada',
    url: 'https://www.instagram.com/velada_mrd?stkn=MXI4NzFtZWxxc20zZQ=='
  },
  {
    name: 'Xtreme Audiovisuales',
    src: '/Logos/sponsors/xtreme-audiovisuales.png',
    alt: 'Xtreme Audiovisuales',
    url: 'https://www.instagram.com/xtremeaudiovisualesmerida?stkn=a25tN2UzMHVlZXAx'
  },
  {
    name: 'Luna Candles',
    src: '/Logos/sponsors/luna-candles.png',
    alt: 'Luna Candles'
  }
];

export default function SponsorsTicker() {
  // Repetir el array para garantizar un desplazamiento continuo, infinito y sin cortes
  const repeatedSponsors = [...SPONSORS, ...SPONSORS, ...SPONSORS];

  const renderSponsorItem = (sponsor, key, isClone = false) => {
    const logoImg = (
      <img
        src={sponsor.src}
        alt={sponsor.alt}
        className="sponsors-ticker-logo"
        loading="lazy"
      />
    );

    return (
      <div key={key} className="sponsors-ticker-item">
        {sponsor.url ? (
          <a
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sponsors-ticker-link"
            aria-label={`Visitar perfil de ${sponsor.alt}`}
            tabIndex={isClone ? -1 : undefined}
          >
            {logoImg}
          </a>
        ) : (
          logoImg
        )}
      </div>
    );
  };

  return (
    <section className="sponsors-ticker-wrapper" aria-label="Sponsors y Aliados">
      <div className="sponsors-ticker-track">
        <div className="sponsors-ticker-group">
          {repeatedSponsors.map((sponsor, index) =>
            renderSponsorItem(sponsor, `sponsor-track1-${index}`, false)
          )}
        </div>

        <div className="sponsors-ticker-group" aria-hidden="true">
          {repeatedSponsors.map((sponsor, index) =>
            renderSponsorItem(sponsor, `sponsor-track2-${index}`, true)
          )}
        </div>
      </div>
    </section>
  );
}
