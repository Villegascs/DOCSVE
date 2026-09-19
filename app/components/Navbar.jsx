"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const showAnimRef = useRef(null);

  const handleHomeClick = (e) => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const elements = gsap.utils.toArray('.nav-directional-element');

    // Animación directionally-aware al estilo GSAP demo
    const showAnim = gsap.fromTo(
      elements,
      { y: 0, opacity: 1, pointerEvents: 'auto' },
      {
        y: -85,
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.35,
        ease: 'power2.out',
        paused: true
      }
    );
    showAnimRef.current = showAnim;

    const trigger = ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: (self) => {
        // Al scrolear hacia ARRIBA (direction === -1) -> mostrar navegación
        if (self.direction === -1) {
          showAnim.reverse();
        } 
        // Al scrolear hacia ABAJO (direction === 1) después de pasar 80px -> ocultar navegación
        // (El logo DOCS de la izquierda NUNCA se oculta, permanece visible y fijo)
        else if (self.direction === 1 && self.scroll() > 80) {
          showAnim.play();
        } 
        // En la parte superior de la página -> siempre visible
        else if (self.scroll() <= 40) {
          showAnim.reverse();
        }
      }
    });

    return () => {
      trigger.kill();
      showAnim.kill();
    };
  }, []);

  return (
    <nav className="navbar" id="navbar">
      <div className="nav-container">
        {/* LOGO DOCS ARRIBA A LA IZQUIERDA (NUNCA SE OCULTA AL SCROLEAR) */}
        <Link href="/" className="nav-brand-left" onClick={handleHomeClick} aria-label="Volver al inicio">
          <img 
            src="/Logos/logo-docs-left.png" 
            alt="DOCS" 
            className="nav-logo-docs"
          />
        </Link>
        
        {/* MENÚ DE NAVEGACIÓN CENTRAL (ANIMADO DIRECCIONALMENTE CON GSAP) */}
        <div className={`nav-links nav-directional-element ${menuOpen ? 'mobile-open' : ''}`}>
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
        
        {/* LADO DERECHO: LOGO CC + MENÚ MÓVIL (ANIMADO DIRECCIONALMENTE CON GSAP) */}
        <div className="nav-right-wrapper nav-directional-element">
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
