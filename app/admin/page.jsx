"use client";
import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState({
    stats: { totalTickets: 0, totalBs: 0, pendingPayments: 0, scannedTickets: 0 },
    latestPayments: []
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quotaError, setQuotaError] = useState(false);

  const fetchDashboard = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setQuotaError(false);
      } else if (json.isQuotaExceeded || json.error?.includes('RESOURCE_EXHAUSTED')) {
        setQuotaError(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatTimeAgo = (timestamp) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins || 1} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="status-badge approved">Aprobado</span>;
      case 'pending': return <span className="status-badge pending">Pendiente</span>;
      case 'rejected': return <span className="status-badge rejected">Rechazado</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Cargando estadísticas...</div>;
  }

  return (
    <>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="admin-title">Dashboard</h1>
        <button
          onClick={fetchDashboard}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#1f1f1f',
            color: '#fff',
            border: '1px solid #333',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {quotaError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          color: '#fff'
        }}>
          <h3 style={{ color: '#f87171', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <AlertTriangle size={18} /> Cuota diaria gratuita de Firebase alcanzada (50.000 lecturas)
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#ccc', lineHeight: 1.5 }}>
            El plan gratuito (Spark) de Google Firebase limita las consultas a 50.000 lecturas por día. Debido a las pruebas de hoy se alcanzó este tope y Firebase pausa temporalmente las consultas del panel hasta medianoche.
            <br /><br />
            <strong>¿Cómo reactivar el panel de inmediato?</strong><br />
            1. Abre tu consola de <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Firebase Console</a>.<br />
            2. En el menú inferior izquierdo de tu proyecto, haz clic en cambiar del plan <strong>Spark</strong> al plan <strong>Blaze (Pay as you go)</strong>.<br />
            3. Al activar Blaze se desbloquea de inmediato. <em>(Las primeras 50.000 lecturas siguen siendo 100% gratis cada día; el consumo extra cuesta solo centavos de dólar)</em>.
          </p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Entradas Vendidas</h3>
          <div className="value">{data.stats.totalTickets}</div>
        </div>
        <div className="stat-card">
          <h3>Ingresos Estimados</h3>
          <div className="value">
            €{data.stats.totalEur ? data.stats.totalEur.toFixed(2) : '0.00'} <span style={{fontSize: '0.6em', color: '#888'}}>| Bs {data.stats.totalBs ? data.stats.totalBs.toLocaleString('es-VE') : '0'}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Pagos Pendientes</h3>
          <div className="value" style={{color: '#fbbf24'}}>{data.stats.pendingPayments}</div>
        </div>
        <div className="stat-card">
          <h3>Entradas Escaneadas</h3>
          <div className="value" style={{color: '#34d399'}}>{data.stats.scannedTickets}</div>
        </div>
      </div>

      <div className="admin-header" style={{marginTop: '3rem'}}>
        <h2>Últimos Pagos</h2>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Entradas</th>
              <th>Banco / Ref</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.latestPayments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', color: '#888'}}>No hay pagos recientes</td>
              </tr>
            ) : (
              data.latestPayments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.name}</td>
                  <td>
                    {payment.ticket_count}x {payment.ticket_type || 'General'}
                    {payment.drink_packs && <div style={{fontSize: '0.75rem', color: '#a855f7'}}>🍾 {payment.drink_packs}</div>}
                  </td>
                  <td>{payment.bank} - {payment.ref}</td>
                  <td>{formatTimeAgo(payment.created_at)}</td>
                  <td>{getStatusBadge(payment.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
