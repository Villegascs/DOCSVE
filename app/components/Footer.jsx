"use client";

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1a1a1a', padding: '4rem 0 2rem 0', background: 'var(--background)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          {/* LOGOS A LA IZQUIERDA: DÖCS Y CREATIVOS CRIOLLOS (CC) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href="#inicio" aria-label="DÖCS Inicio" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img 
                src="/Logos/docs png.png" 
                alt="DÖCS" 
                style={{ height: '40px', width: 'auto', filter: 'drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.3))' }} 
              />
            </a>

            <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '1.2rem', fontWeight: 300 }}>|</span>

            <a 
              href="https://www.instagram.com/creativocriollo/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Creativos Criollos"
              title="Creativos Criollos"
              style={{ display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s, opacity 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.opacity = '1'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.9'; }}
            >
              <img 
                src="/Logos/sponsors/creativos-criollos.png" 
                alt="Creativos Criollos" 
                style={{ height: '30px', width: 'auto', opacity: 0.9, filter: 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.2))' }} 
              />
            </a>
          </div>

          {/* REDES SOCIALES A LA DERECHA: INSTAGRAM Y YOUTUBE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a 
              href="https://www.instagram.com/docs______/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram DÖCS"
              style={{ color: 'white', textDecoration: 'none', transition: 'color 0.25s, transform 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
              onMouseOver={(e) => { e.currentTarget.style.color = '#E1306C'; e.currentTarget.style.transform = 'scale(1.15)'; }} 
              onMouseOut={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <i className="fab fa-instagram" style={{ fontSize: '1.6rem', pointerEvents: 'none' }}></i>
            </a>

            <a 
              href="https://www.youtube.com/@D%C3%B6csEventos" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="YouTube DÖCS Eventos"
              style={{ color: 'white', textDecoration: 'none', transition: 'color 0.25s, transform 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
              onMouseOver={(e) => { e.currentTarget.style.color = '#FF0000'; e.currentTarget.style.transform = 'scale(1.15)'; }} 
              onMouseOut={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <i className="fab fa-youtube" style={{ fontSize: '1.6rem', pointerEvents: 'none' }}></i>
            </a>
          </div>

        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#888', margin: 0, fontFamily: 'var(--font-body)' }}>
            &copy; {new Date().getFullYear()} DÖCS | Eventos. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
