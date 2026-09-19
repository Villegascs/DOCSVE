"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHomeClick = (e) => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Bloquear scroll del fondo cuando el menú móvil esté abierto
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (menuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Activar animación GSAP ÚNICAMENTE en pantallas de escritorio (> 960px)
    // De este modo, GSAP nunca inyectará estilos inline de transform en el menú móvil
    const mm = gsap.matchMedia();

    mm.add("(min-width: 961px)", () => {
      const elements = gsap.utils.toArray('.nav-directional-element');

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

      const trigger = ScrollTrigger.create({
        start: 'top top',
        end: 'max',
        onUpdate: (self) => {
          if (self.direction === -1) {
            showAnim.reverse();
          } else if (self.direction === 1 && self.scroll() > 80) {
            showAnim.play();
          } else if (self.scroll() <= 40) {
            showAnim.reverse();
          }
        }
      });

      return () => {
        trigger.kill();
        showAnim.kill();
      };
    });

    return () => mm.revert();
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
        
        {/* MENÚ DE NAVEGACIÓN CENTRAL / DRAWER MÓVIL */}
        <div className={`nav-links nav-directional-element ${menuOpen ? 'mobile-open' : ''}`}>
          {/* Botón de cierre visible en móvil */}
          <button 
            type="button" 
            className="mobile-close-btn" 
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>

          <Link href="#eventos" className="nav-link" onClick={() => setMenuOpen(false)}>EVENTOS</Link>
          <Link href="#tienda" className="nav-link" onClick={() => setMenuOpen(false)}>TIENDA</Link>
          <Link href="#eventos" className="nav-link" onClick={() => setMenuOpen(false)}>ARTISTS</Link>
          <Link href="#eventos" className="nav-link" onClick={() => setMenuOpen(false)}>SESSIONS</Link>
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
        
        {/* LADO DERECHO: LOGO CC + BOTÓN HAMBURGUESA */}
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
            type="button"
            className={`mobile-menu-btn ${menuOpen ? 'open' : ''}`} 
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
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
