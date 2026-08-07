"use client";
import { useState } from 'react';

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');

  const handleManualScan = (e) => {
    e.preventDefault();
    // Simulación de escaneo
    if (uuidInput === '1234') {
      setScanResult({ valid: true, message: '✅ ACCESO PERMITIDO\nNombre: Armando Rodriguez\nEntrada válida para 1 persona.' });
    } else {
      setScanResult({ valid: false, message: '❌ ENTRADA INVÁLIDA (No existe)' });
    }
  };

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Escáner Web de Entradas</h1>
      </div>

      <div style={{display: 'flex', gap: '2rem'}}>
        <div className="admin-table-container" style={{flex: 1, padding: '2rem'}}>
          <h3>Escáner de Cámara</h3>
          <div style={{
            width: '100%', 
            height: '300px', 
            background: '#000', 
            border: '2px dashed rgba(255,255,255,0.2)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginTop: '1rem',
            marginBottom: '1rem'
          }}>
            <p style={{color: 'var(--text-secondary)'}}>Aquí se integrará la librería de escaneo QR (ej. html5-qrcode)</p>
          </div>
          <button className="btn-primary full-width">Activar Cámara</button>
        </div>

        <div className="admin-table-container" style={{flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column'}}>
          <h3>Ingreso Manual</h3>
          <form onSubmit={handleManualScan} style={{marginTop: '1rem'}}>
            <div className="form-group admin-form">
              <label>Código UUID de la Entrada</label>
              <input 
                type="text" 
                value={uuidInput}
                onChange={(e) => setUuidInput(e.target.value)}
                placeholder="Ej: 550e8400-e29b-41d4-a716-446655440000" 
                required 
                style={{width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px'}}
              />
            </div>
            <button type="submit" className="btn-secondary full-width">Verificar</button>
          </form>

          {scanResult && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              borderRadius: '8px',
              background: scanResult.valid ? '#10b98120' : '#ef444420',
              border: `1px solid ${scanResult.valid ? '#34d399' : '#f87171'}`,
              textAlign: 'center'
            }}>
              <h2 style={{color: scanResult.valid ? '#34d399' : '#f87171', whiteSpace: 'pre-line'}}>
                {scanResult.message}
              </h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
