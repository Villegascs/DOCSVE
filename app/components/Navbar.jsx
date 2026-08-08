"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      const sections = ['inicio', 'eventos', 'tienda', 'musica'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
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
          <Link href="#inicio" className={`nav-link ${activeSection === 'inicio' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link href="#eventos" className={`nav-link ${activeSection === 'eventos' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Eventos</Link>
          <Link href="#tienda" className={`nav-link ${activeSection === 'tienda' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Tienda</Link>
          <Link href="#musica" className={`nav-link ${activeSection === 'musica' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Música</Link>
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
