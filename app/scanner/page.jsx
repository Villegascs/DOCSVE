"use client";
import { useState, useEffect, useRef } from 'react';
import '../admin/admin.css';

export default function SecurityScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const scannerRef = useRef(null);

  // Auth states
  const [authName, setAuthName] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('docs_scanner_name');
      const savedKey = localStorage.getItem('docs_scanner_key');
      if (savedName && savedKey) {
        setAuthName(savedName);
        setAuthKey(savedKey);
        setIsAuthenticated(true);
      }
    } catch (_) {}
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
        try {
          localStorage.setItem('docs_scanner_name', authName);
          localStorage.setItem('docs_scanner_key', authKey);
        } catch (_) {}
        setIsAuthenticated(true);
      } else {
        setAuthError(data.message || 'Clave inválida');
      }
    } catch (e) {
      setAuthError('Error de conexión con el servidor');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('docs_scanner_name');
      localStorage.removeItem('docs_scanner_key');
    } catch (_) {}
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
    } catch (e) {
      setScanResult({ valid: false, message: '❌ ERROR DE CONEXIÓN' });
    }
  };

  const handleManualScan = (e) => {
    e.preventDefault();
    if (!uuidInput) return;
    if (scannerRef.current && isScanning) {
      try {
        if (scannerRef.current.getState() === 2) {
          scannerRef.current.pause(true);
        }
      } catch (_) {}
    }
    processScan(uuidInput);
    setUuidInput('');
  };

  // Gestión de la cámara
  useEffect(() => {
    if (!isScanning) {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        try {
          const state = scanner.getState();
          if (state === 2 || state === 3) {
            scanner.stop().then(() => {
              try { scanner.clear(); } catch (_) {}
            }).catch(() => {});
            return;
          }
        } catch (_) {}
        try { scanner.clear(); } catch (_) {}
      }
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      setCameraLoading(true);
      setCameraError('');

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (isCancelled) return;

        const readerElem = document.getElementById("reader");
        if (!readerElem) return;

        // Limpiar instancia previa si existe
        if (scannerRef.current) {
          try {
            const st = scannerRef.current.getState();
            if (st === 2 || st === 3) await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (_) {}
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const qrConfig = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(180, Math.floor(minEdge * 0.72));
            return { width: edge, height: edge };
          }
        };

        const onScanSuccess = (decodedText) => {
          if (scannerRef.current) {
            try {
              if (scannerRef.current.getState() === 2) {
                scannerRef.current.pause(true);
              }
            } catch (_) {}
          }
          processScan(decodedText);
        };

        const onScanFailure = () => {
          // Ignorar cuadros sin QR
        };

        let cameraStarted = false;

        // Si ya hay una cámara específica elegida por el usuario
        if (selectedCameraId) {
          try {
            await html5QrCode.start(selectedCameraId, qrConfig, onScanSuccess, onScanFailure);
            cameraStarted = true;
          } catch (camErr) {
            console.warn("No se pudo iniciar con la cámara seleccionada, intentando modo environment:", camErr);
          }
        }

        // Intento 1: cámara trasera nativa con facingMode environment (Estándar para iOS y Android)
        if (!cameraStarted) {
          try {
            await html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess, onScanFailure);
            cameraStarted = true;
          } catch (envErr) {
            console.warn("Fallo facingMode environment, buscando lista de dispositivos:", envErr);
          }
        }

        // Intento 2: Buscar dispositivo trasero en getCameras()
        if (!cameraStarted) {
          const deviceList = await Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            // Priorizar cámara trasera amplia/principal
            const rearCam = deviceList.find(d => 
              (d.label.toLowerCase().includes('amplia') || d.label.toLowerCase().includes('wide') || d.label.toLowerCase().includes('0')) &&
              (d.label.toLowerCase().includes('posterior') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'))
            ) || deviceList.find(d => 
              (d.label.toLowerCase().includes('posterior') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')) &&
              !d.label.toLowerCase().includes('front')
            ) || deviceList[deviceList.length - 1]; // En Android el último suele ser la trasera

            await html5QrCode.start(rearCam.id, qrConfig, onScanSuccess, onScanFailure);
            if (!isCancelled) setSelectedCameraId(rearCam.id);
            cameraStarted = true;
          } else {
            throw new Error("No se detectó ninguna cámara disponible en este dispositivo.");
          }
        }

        // Cargar lista completa de cámaras para el selector si hay varias
        try {
          const freshList = await Html5Qrcode.getCameras();
          if (!isCancelled && freshList && freshList.length > 0) {
            setCameras(freshList);
          }
        } catch (_) {}

        if (!isCancelled) {
          setCameraLoading(false);
        }

      } catch (err) {
        console.error("Error al iniciar cámara:", err);
        if (!isCancelled) {
          setCameraLoading(false);
          let userMsg = "No se pudo acceder a la cámara trasera. Asegúrate de otorgar permisos.";
          if (err.name === "NotAllowedError" || err.message?.includes("Permission") || err.message?.includes("denied")) {
            userMsg = "Permiso de cámara bloqueado. Por favor permite el acceso a la cámara en los ajustes de tu navegador o celular.";
          } else if (err.name === "NotFoundError") {
            userMsg = "No se encontró cámara disponible en el dispositivo.";
          } else if (err.name === "NotReadableError") {
            userMsg = "La cámara está ocupada por otra app. Ciérrala e inténtalo de nuevo.";
          }
          setCameraError(userMsg);
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
  }, [isScanning]);

  const handleCameraChange = async (newDeviceId) => {
    if (!scannerRef.current || !newDeviceId) return;
    setSelectedCameraId(newDeviceId);
    setCameraLoading(true);
    setCameraError('');

    try {
      const scanner = scannerRef.current;
      const state = scanner.getState();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: edge, height: edge };
        }
      };

      await scanner.start(
        newDeviceId,
        qrConfig,
        (decodedText) => {
          try {
            if (scannerRef.current?.getState() === 2) {
              scannerRef.current.pause(true);
            }
          } catch (_) {}
          processScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Error al cambiar cámara:", err);
      setCameraError("No se pudo cambiar a la cámara seleccionada.");
    } finally {
      setCameraLoading(false);
    }
  };

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

  if (authLoading) return <div style={{padding: '3rem', textAlign: 'center', color: '#888'}}>Cargando...</div>;

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
      {/* Overlay a pantalla completa para el resultado del escaneo */}
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

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '0 1rem 2rem'}}>
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
                <span style={{fontSize: '2.5rem'}}>📷</span>
                <span style={{fontWeight: 800}}>Iniciar Escaneo</span>
                <span style={{fontSize: '0.85rem', opacity: 0.85, fontWeight: 'normal'}}>
                  (Abre automáticamente la cámara trasera)
                </span>
              </button>
            ) : (
              <div>
                {/* Selector de cámara si hay más de 1 dispositivo */}
                {cameras.length > 1 && (
                  <div style={{
                    marginBottom: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <span style={{fontSize: '0.85rem', color: 'var(--primary-neon, #E0FF00)', fontWeight: 'bold', whiteSpace: 'nowrap'}}>
                      📷 Cámara:
                    </span>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.7rem',
                        background: '#151515',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.85rem',
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

                {cameraLoading && (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--primary-neon, #E0FF00)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    ⏳ Conectando cámara trasera...
                  </div>
                )}

                <div 
                  id="reader" 
                  style={{
                    width: '100%',
                    minHeight: '280px',
                    background: '#000',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid rgba(224, 255, 0, 0.3)'
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
