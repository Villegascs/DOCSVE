"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHomeClick = (e) => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar" id="navbar">
      <div className="nav-container">
        {/* LOGO DOCS ARRIBA A LA IZQUIERDA (Vuelve al inicio) */}
        <Link href="/" className="nav-brand-left" onClick={handleHomeClick} aria-label="Volver al inicio">
          <img 
            src="/Logos/logo-docs-left.png" 
            alt="DOCS" 
            className="nav-logo-docs"
          />
        </Link>
        
        {/* MENÚ DE NAVEGACIÓN SEGÚN LA REFERENCIA */}
        <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
          <Link href="#eventos" className="nav-link" onClick={() => setMenuOpen(false)}>EVENTOS</Link>
          <Link href="#tienda" className="nav-link" onClick={() => setMenuOpen(false)}>TIENDA</Link>
          <Link href="#musica" className="nav-link" onClick={() => setMenuOpen(false)}>ARTISTS</Link>
          <Link href="#musica" className="nav-link" onClick={() => setMenuOpen(false)}>PLAYLIST</Link>
          <Link href="#inicio" className="nav-link" onClick={() => setMenuOpen(false)}>NOSOTROS</Link>
          <button 
            type="button"
            className="nav-link nav-link-btn" 
            onClick={() => {
              setMenuOpen(false);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-get-tickets'));
              }
            }}
          >
            TICKETS
          </button>
        </div>
        
        {/* LADO DERECHO: LOGO CC (Redirige a Instagram) + MENÚ MÓVIL */}
        <div className="nav-right-wrapper">
          <a 
            href="https://www.instagram.com/creativocriollo/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-brand-right"
            aria-label="Creativo Criollo Instagram"
          >
            <img 
              src="/Logos/logo-cc-right.png" 
              alt="Creativo Criollo" 
              className="nav-logo-cc"
            />
          </a>

          <button 
            className="mobile-menu-btn" 
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
