"use client";

export default function AdminSettings() {
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
    </>
  );
}
