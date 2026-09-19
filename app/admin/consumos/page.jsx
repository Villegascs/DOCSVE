"use client";
import { useEffect, useState } from 'react';
import { Clock, Download, CheckCircle, Ticket } from 'lucide-react';
import '../admin.css';

export default function AdminConsumos() {
  const [consumos, setConsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConsumos();
  }, []);

  const fetchConsumos = async () => {
    try {
      const res = await fetch('/api/admin/consumos');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConsumos(data);
      }
    } catch (error) {
      console.error('Error fetching consumos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConsumos = consumos.filter(c => 
    c.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.pack_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.includes(searchTerm)
  );

  return (
    <div className="admin-fade-in" style={{padding: '2rem'}}>
      <div className="admin-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
        <h1 className="admin-title">Auditoría de Barra (Consumos)</h1>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <input 
            type="text" 
            placeholder="Buscar cliente o consumo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-form"
            style={{padding: '0.6rem 1rem', borderRadius: '50px', border: '1px solid #333', background: 'rgba(255,255,255,0.05)', color: 'white'}}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <p style={{padding: '2rem', textAlign: 'center'}}>Cargando consumos...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Comprador</th>
                  <th>Consumo</th>
                  <th>ID Cupón</th>
                  <th>Hora de Canje</th>
                  <th>Canjeado Por</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumos.length === 0 ? (
                  <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No hay cupones registrados.</td></tr>
                ) : (
                  filteredConsumos.map(c => {
                    let scanDate = 'No canjeado';
                    if (c.status === 'used' && c.scanned_at) {
                      const d = new Date(c.scanned_at._seconds * 1000);
                      scanDate = d.toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                    
                    return (
                      <tr key={c.id}>
                        <td>
                          {c.status === 'used' 
                            ? <span className="status-badge status-approved"><CheckCircle size={14} style={{display: 'inline', marginRight: '4px'}}/> Canjeado</span>
                            : <span className="status-badge status-pending"><Ticket size={14} style={{display: 'inline', marginRight: '4px'}}/> Pendiente</span>
                          }
                        </td>
                        <td style={{fontWeight: 'bold'}}>{c.buyer_name}</td>
                        <td style={{color: '#fff'}}>{c.pack_name}</td>
                        <td style={{fontFamily: 'monospace', color: '#888'}}>{c.id.substring(0, 8)}...</td>
                        <td>
                          {c.status === 'used' ? (
                            <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              <Clock size={16} color="#888" /> {scanDate}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{color: c.status === 'used' ? '#a3e635' : '#888'}}>
                          {c.status === 'used' ? (c.scanned_by || 'Desconocido') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
