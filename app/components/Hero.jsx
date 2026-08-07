import Countdown from './Countdown';
import Link from 'next/link';

export default function Hero() {
  // En el futuro, esto se obtendrá dinámicamente de la base de datos
  const nextEventDate = new Date();
  nextEventDate.setDate(nextEventDate.getDate() + 15); // Ejemplo: Próximo evento en 15 días

  return (
    <header id="inicio" className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-badge">Próximo Evento: Pronto</div>
        <h1 className="hero-title">
          <span>WITHOUT MUSIC,</span>
          <span className="highlight">LIFE WOULD BE A MISTAKE.</span>
        </h1>
        
        <Countdown targetDate={nextEventDate.toISOString()} />

        <div className="hero-actions" style={{ marginTop: '2rem' }}>
          <Link href="#eventos" className="btn-primary">COMPRAR ENTRADAS</Link>
          <Link href="#musica" className="btn-secondary">ESCUCHAR SETS</Link>
        </div>
      </div>
    </header>
  );
}
