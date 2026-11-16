/**
 * Utility to calculate and update bill statuses based on due dates and payments
 */

function calculateBillStatus(dueDateStr, isPaid = false) {
  if (isPaid) return 'paid';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 3) {
    return 'pending';
  } else {
    return 'upcoming';
  }
}

/**
 * Calculates the next occurrence date for recurring bills
 */
function calculateNextDueDate(currentDueDateStr, frequency) {
  const date = new Date(currentDueDateStr);
  if (isNaN(date.getTime())) return null;

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return date.toISOString().split('T')[0];
}

module.exports = {
  calculateBillStatus,
  calculateNextDueDate
};
