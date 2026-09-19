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
    <div className="countdown-container" style={{ display: 'inline-flex', flexWrap: 'nowrap', gap: '0.35rem', justifyContent: 'center', margin: '0 auto' }}>
      <div className="countdown-item" style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.6rem', borderRadius: '6px', minWidth: '48px', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff', lineHeight: 1.1 }}>{timeLeft.days}</div>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Días</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.6rem', borderRadius: '6px', minWidth: '48px', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff', lineHeight: 1.1 }}>{timeLeft.hours.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Horas</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.6rem', borderRadius: '6px', minWidth: '48px', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff', lineHeight: 1.1 }}>{timeLeft.minutes.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Minutos</div>
      </div>
      <div className="countdown-item" style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.6rem', borderRadius: '6px', minWidth: '48px', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#ffffff', lineHeight: 1.1 }}>{timeLeft.seconds.toString().padStart(2, '0')}</div>
        <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Segundos</div>
      </div>
    </div>
  );
}
