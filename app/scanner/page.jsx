"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../admin/admin.css';

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  // Auth states
  const [authName, setAuthName] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('docs_scanner_name');
    const savedKey = localStorage.getItem('docs_scanner_key');
    if (savedName && savedKey) {
      setAuthName(savedName);
      setAuthKey(savedKey);
      setIsAuthenticated(true);
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/scanner/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: authKey, name: authName })
      });
      const data = await res.json();
      
      if (data.valid) {
        localStorage.setItem('docs_scanner_name', authName);
        localStorage.setItem('docs_scanner_key', authKey);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.message || 'Clave inválida');
      }
    } catch (e) {
      setAuthError('Error de conexión');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('docs_scanner_name');
    localStorage.removeItem('docs_scanner_key');
    setIsAuthenticated(false);
    setIsScanning(false);
  };

  const processScan = async (uuid) => {
    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, scannerName: authName, scannerKey: authKey })
      });
      const data = await res.json();
      
      if (res.status === 401) {
        handleLogout();
        alert('Tu sesión expiró o la clave fue revocada.');
        return;
      }
      
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
    if (scannerRef.current && isScanning) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          scannerRef.current.pause(true);
        }
      } catch (_) {}
    }
    processScan(uuidInput);
    setUuidInput('');
  };

  useEffect(() => {
    let html5QrCode = null;
    let isCancelled = false;

    if (!isScanning) {
      return;
    }

    const startScanner = async () => {
      setCameraError('');
      try {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        // Try getting initial device list for switcher
        try {
          const deviceList = await Html5Qrcode.getCameras();
          if (!isCancelled && deviceList && deviceList.length > 0) {
            setCameras(deviceList);
          }
        } catch (camErr) {
          console.log("No se pudo enumerar cámaras previas:", camErr);
        }

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0
        };

        const onScanSuccess = (decodedText) => {
          if (scannerRef.current) {
            try {
              scannerRef.current.pause(true);
            } catch (_) {}
          }
          processScan(decodedText);
        };

        const onScanFailure = () => {
          // Ignorar cuadros sin QR
        };

        // Priorizar cámara trasera por defecto ({ facingMode: "environment" }) o la seleccionada
        const cameraTarget = selectedCameraId ? selectedCameraId : { facingMode: "environment" };

        try {
          await html5QrCode.start(cameraTarget, config, onScanSuccess, onScanFailure);
        } catch (startErr) {
          console.warn("Fallo inicio con cámara seleccionada, intentando fallback:", startErr);
          const fallbackList = await Html5Qrcode.getCameras();
          if (fallbackList && fallbackList.length > 0) {
            if (!isCancelled) setCameras(fallbackList);
            const rearCam = fallbackList.find(c => /back|rear|trasera|posterior|environment/i.test(c.label)) || fallbackList[0];
            if (!isCancelled) setSelectedCameraId(rearCam.id);
            await html5QrCode.start(rearCam.id, config, onScanSuccess, onScanFailure);
          } else {
            throw startErr;
          }
        }

        // Actualizar lista de cámaras una vez otorgados los permisos si faltaban nombres
        try {
          const freshList = await Html5Qrcode.getCameras();
          if (!isCancelled && freshList && freshList.length > 0) {
            setCameras(freshList);
            if (!selectedCameraId) {
              const rearCam = freshList.find(c => /back|rear|trasera|posterior|environment/i.test(c.label));
              if (rearCam) setSelectedCameraId(rearCam.id);
            }
          }
        } catch (_) {}

      } catch (err) {
        console.error("Error al iniciar cámara:", err);
        if (!isCancelled) {
          setCameraError(err.message || 'No se pudo acceder a la cámara trasera. Asegúrate de habilitar los permisos.');
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        try {
          const state = scanner.getState();
          // State 2 = SCANNING, State 3 = PAUSED
          if (state === 2 || state === 3) {
            scanner.stop().then(() => {
              try { scanner.clear(); } catch (_) {}
            }).catch(() => {});
            return;
          }
        } catch (_) {}
        try { scanner.clear(); } catch (_) {}
      }
    };
  }, [isScanning, selectedCameraId]);

  const closeResultOverlay = () => {
    setScanResult(null);
    if (scannerRef.current && isScanning) {
      try {
        const state = scannerRef.current.getState();
        if (state === 3) {
          scannerRef.current.resume();
        }
      } catch (e) {
        console.log("Error al reanudar cámara:", e);
      }
    }
  };

  if (authLoading) return <div style={{padding: '2rem', textAlign: 'center'}}>Cargando...</div>;

  if (!isAuthenticated) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem'}}>
        <div className="admin-table-container" style={{padding: '2rem', maxWidth: '400px', width: '100%'}}>
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <img src="/Logos/docs png.png" alt="DOCS" style={{width: '150px'}} />
            <h2 style={{marginTop: '1rem'}}>Escáner de Seguridad</h2>
          </div>
          
          <form className="admin-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Tu Nombre / Alias</label>
              <input 
                type="text" 
                placeholder="Ej: Pedro Perez" 
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Clave de Acceso</label>
              <input 
                type="password" 
                placeholder="Introducir clave secreta" 
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                required
              />
            </div>
            {authError && <p style={{color: '#ff4444', fontSize: '0.9rem', marginBottom: '1rem'}}>{authError}</p>}
            <button type="submit" className="btn-primary full-width">INGRESAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full screen scan result overlay */}
      {scanResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: scanResult.valid ? '#10b981' : '#ef4444',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '2rem', textAlign: 'center'
        }}>
          <h2 style={{
            color: 'white', 
            fontSize: scanResult.valid ? '2.5rem' : '2rem', 
            whiteSpace: 'pre-line', 
            fontWeight: 'bold', 
            margin: 0, 
            marginBottom: '3rem'
          }}>
            {scanResult.message}
          </h2>
          <button 
            onClick={closeResultOverlay}
            style={{
              padding: '1.2rem 3rem', 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              borderRadius: '50px', 
              border: 'none', 
              background: 'white', 
              color: scanResult.valid ? '#10b981' : '#ef4444', 
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            Siguiente Entrada
          </button>
        </div>
      )}

      <div className="admin-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: '1rem'}}>
        <h1 className="admin-title">Escáner Web (Seguridad)</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <span style={{color: '#888'}}>Hola, <strong>{authName}</strong></span>
          <button className="btn-secondary" style={{padding: '0.4rem 0.8rem'}} onClick={handleLogout}>Salir</button>
        </div>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        <div className="admin-table-container" style={{flex: '1 1 400px', padding: '2rem'}}>
          <h3>Escáner de Cámara</h3>
          <div style={{marginTop: '1rem'}}>
            {cameraError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                ⚠️ {cameraError}
              </div>
            )}

            {!isScanning ? (
              <button 
                onClick={() => setIsScanning(true)}
                className="btn-primary full-width"
                style={{
                  padding: '2.5rem 1rem',
                  fontSize: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  borderRadius: '10px'
                }}
              >
                <span style={{fontSize: '2.2rem'}}>📷</span>
                <span style={{fontWeight: 800}}>Iniciar Escaneo</span>
                <span style={{fontSize: '0.85rem', opacity: 0.8, fontWeight: 'normal'}}>
                  (Toma automáticamente la cámara trasera)
                </span>
              </button>
            ) : (
              <div>
                {cameras.length > 1 && (
                  <div style={{
                    marginBottom: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <span style={{fontSize: '0.85rem', color: 'var(--primary-neon)', fontWeight: 'bold'}}>
                      📷 Cámara:
                    </span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.6rem',
                        background: '#151515',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      {cameras.map((cam, idx) => (
                        <option key={cam.id || idx} value={cam.id}>
                          {cam.label || `Cámara ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div 
                  id="reader" 
                  style={{
                    width: '100%', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: '1px solid #333',
                    background: '#000',
                    minHeight: '280px'
                  }}
                ></div>

                <button 
                  onClick={() => setIsScanning(false)}
                  className="btn-secondary full-width"
                  style={{marginTop: '1rem', padding: '0.8rem'}}
                >
                  Detener Escaneo
                </button>
              </div>
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
        </div>
      </div>
    </>
  );
}
