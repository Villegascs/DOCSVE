import GetTicketsButton from './GetTicketsButton';
import { db } from '@/lib/firebase-admin';

export default async function Hero() {
  let dateDisplay = '03 DE OCTUBRE';

  try {
    const snapshot = await db.collection('events').where('isMainEvent', '==', true).limit(1).get();
    if (!snapshot.empty) {
      const mainEvent = snapshot.docs[0].data();
      if (mainEvent.date) {
        const nextEventDate = new Date(mainEvent.date);
        const monthNames = [
          'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
          'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
        ];
        dateDisplay = `${nextEventDate.getDate().toString().padStart(2, '0')} DE ${monthNames[nextEventDate.getMonth()]}`;
      }
    }
  } catch (error) {
    console.error('Error fetching main event:', error);
  }

  return (
    <header id="inicio" className="hero">
      {/* VIDEO DE FONDO CON EL WILD BLOOM ANIMADO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-video"
      >
        <source src="/Multimedia/video-fondo-wildbloom.mp4" type="video/mp4" />
        <source src="/Multimedia/VIDEO%20FONDO%20WILDBLOOM.mp4" type="video/mp4" />
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
