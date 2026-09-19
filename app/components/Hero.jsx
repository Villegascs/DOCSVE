import GetTicketsButton from './GetTicketsButton';

export default async function Hero() {
  // Fecha oficial del evento para la portada: 03 DE OCTUBRE
  const dateDisplay = '03 DE OCTUBRE';

  return (
    <header id="inicio" className="hero">
      {/* VIDEO DE FONDO CON EL WILD BLOOM ANIMADO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="hero-video"
      >
        <source src="/Multimedia/video-fondo-wildbloom.mp4?v=2" type="video/mp4" />
        <source src="/Multimedia/VIDEO%20FONDO%20WILDBLOOM.mp4?v=2" type="video/mp4" />
      </video>

      {/* LOGOS INTERACTIVOS FLOWERS X DOCS */}
      <div className="hero-top-logo">
        <div className="hero-flowers-docs-group">
          <a 
            href="https://www.instagram.com/flowersss_official/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hero-brand-link hero-link-flowers"
            aria-label="Instagram Flowers"
            title="Instagram @flowersss_official"
          >
            <img 
              src="/Logos/logo-flowers.png" 
              alt="FLOWERS" 
              className="hero-logo-img hero-img-flowers"
            />
          </a>

          <span className="hero-logo-x">x</span>

          <a 
            href="https://www.instagram.com/docs______/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hero-brand-link hero-link-docs"
            aria-label="Instagram DOCS"
            title="Instagram @docs______"
          >
            <img 
              src="/Logos/logo-docs-letra.png" 
              alt="DÖCS" 
              className="hero-logo-img hero-img-docs"
            />
          </a>
        </div>
      </div>

      {/* FECHA DEL EVENTO ABAJO DE WILD BLOOM */}
      <div className="hero-bottom-date">
        <span>{dateDisplay}</span>
      </div>

      {/* TEXTO DE RESPONSABILIDAD AL FONDO CENTRADO */}
      <div className="hero-disclaimer">
        <span>CELEBRA LA VIDA CON RESPONSABILIDAD, SI CONSUMES LICOR NO CONDUZCAS.</span>
      </div>

      {/* BOTÓN GET TICKETS ABAJO A LA DERECHA */}
      <GetTicketsButton className="hero-btn-tickets">
        GET TICKETS
      </GetTicketsButton>
    </header>
  );
}
