"use client";

import { useState, useEffect } from 'react';

export default function AdminSettings() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/scanner-keys');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKey) return;
    
    try {
      const res = await fetch('/api/admin/scanner-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey })
      });
      const data = await res.json();
      if (data.success) {
        setNewKey('');
        fetchKeys();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteKey = async (id) => {
    if (confirm('¿Eliminar esta clave? Los escáneres que la usen ya no podrán acceder.')) {
      try {
        await fetch(`/api/admin/scanner-keys?id=${id}`, { method: 'DELETE' });
        fetchKeys();
      } catch (e) {
        console.error(e);
      }
    }
  };
  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Configuración</h1>
      </div>

      <div className="admin-table-container" style={{padding: '2rem', maxWidth: '600px'}}>
        <h2>Plantilla de Entradas</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>
          Sube la imagen base que se usará para generar las entradas. El sistema superpondrá el código QR y el nombre del comprador automáticamente.
        </p>

        <form className="admin-form" onSubmit={(e) => { e.preventDefault(); alert('Guardado'); }}>
          <div className="form-group">
            <label>Plantilla Actual</label>
            <div style={{
              width: '200px', 
              height: '333px', 
              background: '#000', 
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <span style={{color: 'var(--text-secondary)'}}>No hay plantilla</span>
            </div>
          </div>

          <div className="form-group">
            <label>Subir Nueva Plantilla (Recomendado 600x1000px)</label>
            <input type="file" accept="image/png, image/jpeg" style={{width: '100%'}} />
          </div>

          <button type="submit" className="btn-primary">ACTUALIZAR PLANTILLA</button>
        </form>
      </div>

      <div className="admin-table-container" style={{padding: '2rem', maxWidth: '600px', marginTop: '2rem'}}>
        <h2>Claves de Escáner en Puerta</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>
          Crea claves para que el personal de seguridad pueda acceder al escáner público.
        </p>

        <form className="admin-form" onSubmit={handleAddKey} style={{marginBottom: '2rem', display: 'flex', gap: '1rem'}}>
          <input 
            type="text" 
            placeholder="Nueva clave (Ej. DOCS2024)" 
            value={newKey} 
            onChange={(e) => setNewKey(e.target.value)} 
            required 
            style={{flexGrow: 1}}
          />
          <button type="submit" className="btn-primary" style={{width: 'auto'}}>Añadir Clave</button>
        </form>

        {loading ? (
          <p>Cargando claves...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Clave</th>
                <th>Usuarios Registrados</th>
                <th style={{textAlign: 'right'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr><td colSpan="2" style={{textAlign: 'center'}}>No hay claves configuradas.</td></tr>
              ) : keys.map(k => (
                <tr key={k.id}>
                  <td style={{fontFamily: 'monospace', fontSize: '1.2rem'}}>{k.key}</td>
                  <td>
                    {k.active_users && k.active_users.length > 0 
                      ? k.active_users.map(u => <span key={u} style={{display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginRight: '0.5rem', fontSize: '0.9rem'}}>{u}</span>) 
                      : <span style={{color: '#888'}}>Ninguno</span>}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <button className="btn-secondary" style={{color: '#ff4444', borderColor: '#ff4444', padding: '0.4rem 0.8rem'}} onClick={() => handleDeleteKey(k.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
