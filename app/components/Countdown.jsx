"use client";
import { useState, useEffect } from 'react';

export default function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      setTimeLeft(newTimeLeft);
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="countdown-container" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0' }}>
      <div className="countdown-item" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(12px)', padding: '1rem', borderRadius: '8px', minWidth: '80px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: 'var(--primary-neon)' }}>{timeLeft.days}</div>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Días</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(12px)', padding: '1rem', borderRadius: '8px', minWidth: '80px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: 'var(--primary-neon)' }}>{timeLeft.hours.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Horas</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(12px)', padding: '1rem', borderRadius: '8px', minWidth: '80px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: 'var(--primary-neon)' }}>{timeLeft.minutes.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Minutos</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(17,17,17,0.7)', backdropFilter: 'blur(12px)', padding: '1rem', borderRadius: '8px', minWidth: '80px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)', color: 'var(--primary-neon)' }}>{timeLeft.seconds.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Segundos</div>
      </div>
    </div>
  );
}
