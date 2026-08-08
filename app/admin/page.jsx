"use client";
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState({
    stats: { totalTickets: 0, totalBs: 0, pendingPayments: 0, scannedTickets: 0 },
    latestPayments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
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
      <div className="admin-header">
        <h1 className="admin-title">Dashboard</h1>
      </div>

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
