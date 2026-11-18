/**
 * Expense Tracker System - Data Export & Backup Manager
 */

class ExportManager {
  /**
   * Export transactions list to CSV file
   */
  static exportToCSV(transactions, currencyCode = 'USD') {
    if (!transactions || transactions.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Description / Title',
      'Amount',
      'Currency',
      'Payment Method',
      'Notes'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = transactions.map(t => {
      const cat = StorageManager.getCategoryById(t.categoryId);
      return [
        escapeCsv(t.id),
        escapeCsv(t.date),
        escapeCsv(t.type.toUpperCase()),
        escapeCsv(cat ? cat.name : 'Uncategorized'),
        escapeCsv(t.title),
        escapeCsv(t.amount.toFixed(2)),
        escapeCsv(currencyCode),
        escapeCsv(t.paymentMethod || 'N/A'),
        escapeCsv(t.notes || '')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export complete application state to JSON backup
   */
  static exportToJSON() {
    const data = StorageManager.exportDataPackage();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expensio_backup_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import complete JSON backup
   */
  static importFromJSON(file, onSuccess, onError) {
    if (!file) {
      if (onError) onError('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        StorageManager.importDataPackage(parsed);
        if (onSuccess) onSuccess();
      } catch (err) {
        if (onError) onError('Invalid or corrupted JSON backup file: ' + err.message);
      }
    };
    reader.onerror = () => {
      if (onError) onError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  }

  /**
   * Trigger clean printable view
   */
  static triggerPrint() {
    window.print();
  }
}
