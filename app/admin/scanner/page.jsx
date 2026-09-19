"use client";
import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import '../admin.css';

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
        processScan(decodedText).then(() => {
          setTimeout(() => {
            if (scannerRef.current) {
              try {
                scannerRef.current.resume();
              } catch (_) {}
            }
          }, 3000);
        });
      },
      () => {}
    );

    let autoStarted = false;
    const interval = setInterval(() => {
      const select = document.getElementById("html5-qrcode-select-camera");
      const startBtn = document.getElementById("html5-qrcode-button-camera-start");

      if (select && select.options.length > 0) {
        let bestRearIndex = -1;
        for (let i = 0; i < select.options.length; i++) {
          const text = select.options[i].text.toLowerCase();
          if ((text.includes('amplia') || text.includes('wide')) && (text.includes('posterior') || text.includes('back') || text.includes('trasera'))) {
            bestRearIndex = i;
            break;
          }
        }
        if (bestRearIndex === -1) {
          for (let i = 0; i < select.options.length; i++) {
            const text = select.options[i].text.toLowerCase();
            if ((text.includes('posterior') || text.includes('trasera') || text.includes('back') || text.includes('environment')) && !text.includes('front') && !text.includes('frontal')) {
              bestRearIndex = i;
              break;
            }
          }
        }
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
