"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  const processScan = async (uuid) => {
    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });
      const data = await res.json();
      setScanResult(data);
      if (data.valid) {
        // Play success sound if needed
      }
    } catch (e) {
      setScanResult({ valid: false, message: '❌ ERROR DE CONEXIÓN' });
    }
  };

  const handleManualScan = (e) => {
    e.preventDefault();
    if (!uuidInput) return;
    processScan(uuidInput);
    setUuidInput('');
  };

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        /* verbose= */ false
      );
      
      scannerRef.current.render(
        (decodedText) => {
          // Pause scanning to prevent multiple triggers
          scannerRef.current.pause(true);
          processScan(decodedText).then(() => {
            setTimeout(() => {
              if (scannerRef.current) scannerRef.current.resume();
            }, 3000);
          });
        },
        (error) => {
          // Ignorar errores de "no se detecta código"
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Escáner Web de Entradas</h1>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        <div className="admin-table-container" style={{flex: '1 1 400px', padding: '2rem'}}>
          <h3>Escáner de Cámara</h3>
          <div style={{marginTop: '1rem'}}>
            {!isScanning ? (
              <button 
                onClick={() => setIsScanning(true)}
                className="btn-primary full-width"
                style={{padding: '3rem 0', fontSize: '1.2rem'}}
              >
                Activar Cámara
              </button>
            ) : (
              <div id="reader" style={{width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #333'}}></div>
            )}
            
            {isScanning && (
              <button 
                onClick={() => {
                  setIsScanning(false);
                  if (scannerRef.current) {
                    scannerRef.current.clear();
                    scannerRef.current = null;
                  }
                }}
                className="btn-secondary full-width"
                style={{marginTop: '1rem'}}
              >
                Apagar Cámara
              </button>
            )}
          </div>
        </div>

        <div className="admin-table-container" style={{flex: '1 1 400px', padding: '2rem', display: 'flex', flexDirection: 'column'}}>
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
              padding: '2rem',
              borderRadius: '8px',
              background: scanResult.valid ? '#10b98120' : '#ef444420',
              border: `2px solid ${scanResult.valid ? '#34d399' : '#f87171'}`,
              textAlign: 'center'
            }}>
              <h2 style={{
                color: scanResult.valid ? '#34d399' : '#f87171', 
                whiteSpace: 'pre-line',
                fontSize: '1.5rem',
                margin: 0
              }}>
                {scanResult.message}
              </h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
