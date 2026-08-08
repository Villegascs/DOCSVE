export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1a1a1a', padding: '4rem 0 2rem 0', background: 'var(--background)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
          <div>
            <img 
              src="/Logos/docs png.png" 
              alt="DOCS" 
              style={{ height: '40px', filter: 'drop-shadow(0px 0px 8px rgba(255, 255, 255, 0.3))' }} 
            />
          </div>
          <div>
            <a href="https://instagram.com/docs.events" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={(e) => e.target.style.color = '#ccc'} onMouseOut={(e) => e.target.style.color = 'white'}>
              <i className="fab fa-instagram" style={{ fontSize: '1.5rem', pointerEvents: 'none' }}></i>
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
