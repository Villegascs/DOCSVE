import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EventsGrid from './components/EventsGrid';
import Footer from './components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <EventsGrid />
      
      <section id="tienda" style={{ padding: '8rem 2rem', textAlign: 'center', background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>MERCH OFICIAL</h2>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>Próximamente. Viste la cultura.</p>
      </section>

      <section id="musica" style={{ padding: '8rem 2rem', textAlign: 'center', background: '#050505', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>ÚLTIMOS SETS</h2>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>Revive la experiencia. Sets grabados en vivo.</p>
      </section>

      <Footer />
    </>
  );
}
