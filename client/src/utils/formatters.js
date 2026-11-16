export function formatCurrency(amount, symbol = '$') {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'overdue':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse';
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'upcoming':
    default:
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  }
}

export function getFrequencyLabel(frequency) {
  const map = {
    'one-time': 'One-time',
    'daily': 'Daily',
    'weekly': 'Weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'half-yearly': 'Half-Yearly',
    'yearly': 'Yearly'
  };
  return map[frequency] || frequency || 'One-time';
}
