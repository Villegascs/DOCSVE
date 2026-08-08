export function convertTicketsToCSV(tickets) {
  const header = ['Nombre', 'Cedula', 'Email', 'Telefono', 'Entradas', 'Combos', 'Total Bs', 'Total Eur', 'Banco', 'Ref', 'Estado', 'Fecha'];
  
  const rows = tickets.map(t => {
    const date = t.created_at ? new Date(t.created_at._seconds ? t.created_at._seconds * 1000 : t.created_at).toLocaleString('es-VE') : '';
    return [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${(t.cedula || '').replace(/"/g, '""')}"`,
      `"${(t.email || '').replace(/"/g, '""')}"`,
      `"${(t.phone || '').replace(/"/g, '""')}"`,
      `${t.ticket_count || 1}x ${t.ticket_type || 'General'}`,
      `"${(t.drink_packs || '').replace(/"/g, '""')}"`,
      t.total_bs || 0,
      t.total_eur || 0,
      `"${(t.bank || t.banco || '').replace(/"/g, '""')}"`,
      `"${(t.ref || t.referencia || '').replace(/"/g, '""')}"`,
      t.status || 'pending',
      `"${date}"`
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

export function convertScannedToCSV(qrs) {
  const header = ['ID Ticket', 'UUID QR', 'Comprador', 'Estado', 'Fecha Escaneo'];
  
  const rows = qrs.map(qr => {
    const date = qr.scanned_at ? new Date(qr.scanned_at._seconds ? qr.scanned_at._seconds * 1000 : qr.scanned_at).toLocaleString('es-VE') : '';
    return [
      `"${(qr.ticket_id || '').replace(/"/g, '""')}"`,
      `"${(qr.uuid || '').replace(/"/g, '""')}"`,
      `"${(qr.ticket_name || '').replace(/"/g, '""')}"`,
      qr.status || 'used',
      `"${date}"`
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}
