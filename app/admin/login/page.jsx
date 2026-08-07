"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'DOCS' && password === 'Docs2026') {
      localStorage.setItem('docs_admin_auth', 'true');
      router.push('/admin');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-darker)'
    }}>
      <div className="glass-panel" style={{
        padding: '3rem', 
        borderRadius: '12px', 
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <img src="/Logos/docs png.png" alt="DOCS Logo" style={{ width: '150px', marginBottom: '2rem' }} />
        <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>ACCESO ADMIN</h2>
        
        {error && <div style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ color: '#A0A0A0', fontSize: '0.85rem', fontWeight: 'bold' }}>Usuario</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              style={{
                width: '100%',
                background: '#181818',
                border: '1px solid #2A2A2A',
                padding: '0.8rem',
                borderRadius: '4px',
                color: 'white'
              }}
            />
          </div>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ color: '#A0A0A0', fontSize: '0.85rem', fontWeight: 'bold' }}>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{
                width: '100%',
                background: '#181818',
                border: '1px solid #2A2A2A',
                padding: '0.8rem',
                borderRadius: '4px',
                color: 'white'
              }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}
