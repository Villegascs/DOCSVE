export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>DÖCS</h2>
            <p>Underground Electronic Music Experience</p>
          </div>
          <div className="footer-links">
            <a href="https://instagram.com/docs.events" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram"></i> Instagram
            </a>
            <a href="mailto:docs.underground@gmail.com">
              <i className="fas fa-envelope"></i> Contacto
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} DOCS Events. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
