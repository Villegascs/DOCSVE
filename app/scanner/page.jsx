"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import '../admin/admin.css';

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
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
        scannerRef.current.pause(true);
      } catch (_) {}
    }
    processScan(uuidInput);
    setUuidInput('');
  };

  useEffect(() => {
    if (!isScanning) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (_) {}
        scannerRef.current = null;
      }
      return;
    }

    // Pre-guardar la cámara trasera en localStorage si está disponible
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const videoDevs = devices.filter(d => d.kind === 'videoinput');
          const rear = videoDevs.find(d => 
            (d.label.toLowerCase().includes('amplia') || d.label.toLowerCase().includes('wide')) &&
            (d.label.toLowerCase().includes('posterior') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('back'))
          ) || videoDevs.find(d => 
            (d.label.toLowerCase().includes('posterior') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('back')) &&
            !d.label.toLowerCase().includes('front')
          );
          if (rear && rear.deviceId) {
            localStorage.setItem("HTML5_QRCODE_DATA", JSON.stringify({
              hasPermission: true,
              lastUsedCameraId: rear.deviceId
            }));
          }
        }).catch(() => {});
      }
    } catch (_) {}

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        try {
          scanner.pause(true);
        } catch (_) {}
        processScan(decodedText);
      },
      () => {}
    );

    // Observador continuo: selecciona automáticamente la cámara trasera y arranca el escaneo
    let autoStarted = false;
    const interval = setInterval(() => {
      const select = document.getElementById("html5-qrcode-select-camera");
      const startBtn = document.getElementById("html5-qrcode-button-camera-start");

      if (select && select.options.length > 0) {
        let bestRearIndex = -1;
        
        // 1. Prioridad: lente trasero principal / amplia
        for (let i = 0; i < select.options.length; i++) {
          const text = select.options[i].text.toLowerCase();
          if ((text.includes('amplia') || text.includes('wide')) && (text.includes('posterior') || text.includes('back') || text.includes('trasera'))) {
            bestRearIndex = i;
            break;
          }
        }
        // 2. Cualquier lente trasero / posterior
        if (bestRearIndex === -1) {
          for (let i = 0; i < select.options.length; i++) {
            const text = select.options[i].text.toLowerCase();
            if ((text.includes('posterior') || text.includes('trasera') || text.includes('back') || text.includes('environment')) && !text.includes('front') && !text.includes('frontal')) {
              bestRearIndex = i;
              break;
            }
          }
        }
        // 3. Cualquier lente que no sea frontal
        if (bestRearIndex === -1) {
          for (let i = 0; i < select.options.length; i++) {
            const text = select.options[i].text.toLowerCase();
            if (!text.includes('front') && !text.includes('frontal') && !text.includes('user')) {
              bestRearIndex = i;
              break;
            }
          }
        }

        if (bestRearIndex !== -1 && select.selectedIndex !== bestRearIndex) {
          select.selectedIndex = bestRearIndex;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Si el botón de iniciar escaneo está presente, hacer clic automático
        if (startBtn && startBtn.offsetParent !== null && !autoStarted) {
          autoStarted = true;
          startBtn.click();
        }
      }
    }, 150);

    return () => {
      clearInterval(interval);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (_) {}
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const closeResultOverlay = () => {
    setScanResult(null);
    if (scannerRef.current && isScanning) {
      try {
        scannerRef.current.resume();
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
                <div id="reader" style={{width: '100%'}}></div>
                <button 
                  onClick={() => setIsScanning(false)}
                  className="btn-secondary full-width"
                  style={{marginTop: '1rem', padding: '0.8rem'}}
                >
                  Apagar Cámara
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
