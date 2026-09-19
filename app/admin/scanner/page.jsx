"use client";
import { useState, useEffect, useRef } from 'react';
import '../admin.css';

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [uuidInput, setUuidInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [activeCameraLabel, setActiveCameraLabel] = useState('');
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

  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraLoading(true);
    setCameraError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempId = "file-scanner-admin-temp";
      let tempElem = document.getElementById(tempId);
      if (!tempElem) {
        tempElem = document.createElement("div");
        tempElem.id = tempId;
        tempElem.style.display = "none";
        document.body.appendChild(tempElem);
      }
      const fileScanner = new Html5Qrcode(tempId);
      const decoded = await fileScanner.scanFile(file, false);
      try { fileScanner.clear(); } catch (_) {}
      if (tempElem && tempElem.parentNode) {
        tempElem.parentNode.removeChild(tempElem);
      }
      if (decoded) {
        processScan(decoded);
      }
    } catch (err) {
      console.error("Error al procesar foto:", err);
      setCameraError("No se detectó un código QR en la foto.");
    } finally {
      setCameraLoading(false);
      e.target.value = '';
    }
  };

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

        if (scannerRef.current) {
          try {
            const st = scannerRef.current.getState();
            if (st === 2 || st === 3) await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (_) {}
          scannerRef.current = null;
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
          processScan(decodedText).then(() => {
            setTimeout(() => {
              if (scannerRef.current) {
                try {
                  if (scannerRef.current.getState() === 3) {
                    scannerRef.current.resume();
                  }
                } catch (_) {}
              }
            }, 3000);
          });
        };

        const onScanFailure = () => {};

        let knownCameras = [];
        try {
          knownCameras = await Html5Qrcode.getCameras();
        } catch (_) {}

        const bestRearCamera = knownCameras.find(c => 
          (c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('trasera') || c.label.toLowerCase().includes('posterior')) &&
          (c.label.toLowerCase().includes('wide') || c.label.toLowerCase().includes('amplia') || c.label.toLowerCase().includes('0') || c.label.toLowerCase().includes('1'))
        ) || knownCameras.find(c => 
          /back|rear|trasera|posterior|environment/i.test(c.label) &&
          !/front|frontal|user|truedepth/i.test(c.label)
        );

        let cameraStarted = false;

        if (selectedCameraId) {
          try {
            await html5QrCode.start(selectedCameraId, qrConfig, onScanSuccess, onScanFailure);
            cameraStarted = true;
          } catch (camErr) {
            console.warn("Fallo cámara seleccionada:", camErr);
          }
        }

        if (!cameraStarted && bestRearCamera?.id) {
          try {
            await html5QrCode.start(bestRearCamera.id, qrConfig, onScanSuccess, onScanFailure);
            if (!isCancelled) {
              setSelectedCameraId(bestRearCamera.id);
              setActiveCameraLabel(bestRearCamera.label || 'Cámara trasera');
            }
            cameraStarted = true;
          } catch (idErr) {
            console.warn("Fallo ID de cámara trasera:", idErr);
          }
        }

        if (!cameraStarted) {
          try {
            await html5QrCode.start(
              { facingMode: { exact: "environment" } },
              qrConfig,
              onScanSuccess,
              onScanFailure
            );
            cameraStarted = true;
            if (!isCancelled) setActiveCameraLabel('Cámara trasera (Forzada)');
          } catch (exactErr) {
            console.warn("exact environment no soportado, probando environment:", exactErr);
          }
        }

        if (!cameraStarted) {
          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              qrConfig,
              onScanSuccess,
              onScanFailure
            );
            cameraStarted = true;
            if (!isCancelled) setActiveCameraLabel('Cámara trasera');
          } catch (envErr) {
            console.warn("Fallo facingMode environment:", envErr);
          }
        }

        if (!cameraStarted) {
          const deviceList = await Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            const fallbackRear = deviceList.find(d => !/front|frontal|user|truedepth/i.test(d.label)) || deviceList[deviceList.length - 1];
            await html5QrCode.start(fallbackRear.id, qrConfig, onScanSuccess, onScanFailure);
            if (!isCancelled) {
              setSelectedCameraId(fallbackRear.id);
              setActiveCameraLabel(fallbackRear.label || 'Cámara seleccionada');
            }
            cameraStarted = true;
          } else {
            throw new Error("No se detectó cámara disponible.");
          }
        }

        try {
          const freshList = await Html5Qrcode.getCameras();
          if (!isCancelled && freshList && freshList.length > 0) {
            const sorted = [...freshList].sort((a, b) => {
              const aRear = /back|rear|trasera|posterior|environment/i.test(a.label);
              const bRear = /back|rear|trasera|posterior|environment/i.test(b.label);
              if (aRear && !bRear) return -1;
              if (!aRear && bRear) return 1;
              return 0;
            });
            setCameras(sorted);
            if (!selectedCameraId) {
              const rear = sorted.find(c => /back|rear|trasera|posterior|environment/i.test(c.label)) || sorted[0];
              setSelectedCameraId(rear.id);
              setActiveCameraLabel(rear.label);
            }
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
            userMsg = "Permiso de cámara bloqueado. Ve a Ajustes > Safari / Chrome > Cámara y permite el acceso.";
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
    if (!newDeviceId) return;
    setSelectedCameraId(newDeviceId);
    const camObj = cameras.find(c => c.id === newDeviceId);
    if (camObj) setActiveCameraLabel(camObj.label);

    setCameraLoading(true);
    setCameraError('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        try { scannerRef.current.clear(); } catch (_) {}
      }

      const freshScanner = new Html5Qrcode("reader");
      scannerRef.current = freshScanner;

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: edge, height: edge };
        }
      };

      await freshScanner.start(
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

  const flipCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    handleCameraChange(cameras[nextIndex].id);
  };

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Escáner Web de Entradas</h1>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        <div className="admin-table-container" style={{flex: '1 1 400px', padding: '1.5rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h3 style={{margin: 0}}>Escáner de Cámara</h3>
            {isScanning && (
              <span style={{
                fontSize: '0.75rem', 
                background: activeCameraLabel.toLowerCase().includes('front') || activeCameraLabel.toLowerCase().includes('user') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: activeCameraLabel.toLowerCase().includes('front') || activeCameraLabel.toLowerCase().includes('user') ? '#f87171' : '#34d399',
                padding: '0.25rem 0.6rem',
                borderRadius: '20px',
                border: '1px solid currentColor'
              }}>
                {activeCameraLabel.toLowerCase().includes('front') || activeCameraLabel.toLowerCase().includes('user') ? '🤳 Frontal' : '📷 Trasera'}
              </span>
            )}
          </div>

          <div>
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
              <div>
                <button 
                  onClick={() => setIsScanning(true)}
                  className="btn-primary full-width"
                  style={{
                    padding: '2.2rem 1rem',
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderRadius: '12px'
                  }}
                >
                  <span style={{fontSize: '2.5rem'}}>📷</span>
                  <span style={{fontWeight: 800}}>Iniciar Escáner en Vivo</span>
                  <span style={{fontSize: '0.85rem', opacity: 0.85, fontWeight: 'normal'}}>
                    (Activa la cámara trasera de tu iPhone)
                  </span>
                </button>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  marginTop: '1rem',
                  border: '1px dashed rgba(224, 255, 0, 0.4)',
                  background: 'rgba(224, 255, 0, 0.05)',
                  color: 'white',
                  fontWeight: '600',
                  textAlign: 'center',
                  fontSize: '0.92rem'
                }}>
                  <span style={{fontSize: '1.3rem'}}>📸</span>
                  <span>Tomar Foto con Cámara del Teléfono / Subir QR</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileScan}
                  />
                </label>
              </div>
            ) : (
              <div>
                <div style={{
                  marginBottom: '0.8rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  {cameras.length > 1 && (
                    <button
                      onClick={flipCamera}
                      className="btn-secondary"
                      style={{
                        padding: '0.55rem 0.9rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#222',
                        borderColor: '#444'
                      }}
                      title="Girar entre cámaras"
                    >
                      🔄 <span>Girar Cámara</span>
                    </button>
                  )}

                  {cameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '150px',
                        padding: '0.5rem 0.6rem',
                        background: '#151515',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    >
                      {cameras.map((cam, idx) => {
                        const isRear = /back|rear|trasera|posterior|environment/i.test(cam.label);
                        const isFront = /front|frontal|user/i.test(cam.label);
                        const prefix = isRear ? '📷 Trasera: ' : isFront ? '🤳 Frontal: ' : '📷 ';
                        return (
                          <option key={cam.id || idx} value={cam.id}>
                            {prefix}{cam.label || `Cámara ${idx + 1}`}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {cameraLoading && (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--primary-neon, #E0FF00)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    ⏳ Conectando cámara trasera del iPhone...
                  </div>
                )}

                <div 
                  id="reader" 
                  style={{
                    width: '100%', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(224, 255, 0, 0.3)',
                    background: '#000',
                    minHeight: '280px'
                  }}
                ></div>

                <div style={{display: 'flex', gap: '0.8rem', marginTop: '1rem'}}>
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ddd',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    <span>📸 Tomar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleFileScan}
                    />
                  </label>

                  <button 
                    onClick={() => setIsScanning(false)}
                    className="btn-secondary"
                    style={{padding: '0.75rem 1.2rem', fontSize: '0.85rem'}}
                  >
                    Detener
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-table-container" style={{flex: '1 1 400px', padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
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
