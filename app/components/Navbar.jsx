"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="nav-container">
        <Link href="#inicio" className="logo">
          <img src="/Logos/docs png.png" alt="DOCS" style={{ height: '35px', verticalAlign: 'middle' }} />
        </Link>
        
        <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`} style={menuOpen ? { display: 'flex', flexDirection: 'column', position: 'absolute', top: '80px', left: 0, width: '100%', background: 'rgba(5,5,5,0.95)', padding: '2rem' } : {}}>
          <Link href="#inicio" className="nav-link active" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link href="#eventos" className="nav-link" onClick={() => setMenuOpen(false)}>Eventos</Link>
          <Link href="#tienda" className="nav-link" onClick={() => setMenuOpen(false)}>Tienda</Link>
          <Link href="#musica" className="nav-link" onClick={() => setMenuOpen(false)}>Música</Link>
        </div>
        
        <Link href="#eventos" className="btn-tickets">TICKETS</Link>

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
    </nav>
  );
}
