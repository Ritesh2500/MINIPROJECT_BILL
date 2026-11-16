const db = require('../config/db');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Helper to fetch report rows
async function getReportRows(userId, { startDate, endDate, category, status }) {
  let query = `
    SELECT b.id AS bill_id, b.name AS bill_name, c.name AS category_name, b.amount AS bill_amount,
           b.due_date, b.payment_status, b.billing_frequency,
           p.payment_date, p.payment_method, p.amount_paid, p.transaction_id, p.notes
    FROM bills b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN payments p ON b.id = p.bill_id
    WHERE b.user_id = ?
  `;
  const params = [userId];

  if (category && category !== 'all') {
    query += ` AND b.category_id = ?`;
    params.push(category);
  }

  if (status && status !== 'all') {
    query += ` AND b.payment_status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND b.due_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND b.due_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY b.due_date DESC, p.payment_date DESC`;

  const [rows] = await db.query(query, params);
  return rows;
}

// GET /api/reports/data
exports.getReportData = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await getReportRows(userId, req.query);

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.bill_amount), 0);
    const totalPaid = rows.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

    return res.json({
      success: true,
      records: rows,
      summary: {
        totalRecords: rows.length,
        totalBilled: Math.round(totalAmount * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving report data.' });
  }
};

// GET /api/reports/csv
exports.exportCsv = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await getReportRows(userId, req.query);

    const headers = ['Bill Name', 'Category', 'Billed Amount', 'Due Date', 'Status', 'Frequency', 'Paid Amount', 'Payment Date', 'Payment Method', 'Transaction ID'];
    const csvLines = [headers.join(',')];

    rows.forEach(r => {
      const line = [
        `"${(r.bill_name || '').replace(/"/g, '""')}"`,
        `"${(r.category_name || '').replace(/"/g, '""')}"`,
        Number(r.bill_amount || 0).toFixed(2),
        r.due_date || '',
        r.payment_status || '',
        r.billing_frequency || '',
        r.amount_paid ? Number(r.amount_paid).toFixed(2) : '0.00',
        r.payment_date || '',
        `"${(r.payment_method || '').replace(/"/g, '""')}"`,
        `"${(r.transaction_id || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(line.join(','));
    });

    const csvContent = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="billmate-financial-report.csv"');
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting CSV.' });
  }
};

// GET /api/reports/excel
exports.exportExcel = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await getReportRows(userId, req.query);

    const formattedData = rows.map(r => ({
      'Bill Name': r.bill_name,
      'Category': r.category_name,
      'Billed Amount ($)': Number(r.bill_amount || 0),
      'Due Date': r.due_date,
      'Status': r.payment_status,
      'Frequency': r.billing_frequency,
      'Paid Amount ($)': Number(r.amount_paid || 0),
      'Payment Date': r.payment_date || 'N/A',
      'Payment Method': r.payment_method || 'N/A',
      'Transaction ID': r.transaction_id || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills and Payments');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="billmate-financial-report.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting Excel.' });
  }
};

// GET /api/reports/pdf
exports.exportPdf = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await getReportRows(userId, req.query);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Document header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('BillMate - Financial & Payment Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Account User: ${req.user.name} (${req.user.email})`, 14, 28);

    // Summary calculations
    const totalBilled = rows.reduce((sum, r) => sum + Number(r.bill_amount), 0);
    const totalPaid = rows.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

    doc.text(`Total Records: ${rows.length} | Total Billed: $${totalBilled.toFixed(2)} | Total Paid: $${totalPaid.toFixed(2)}`, 14, 34);

    const tableRows = rows.map(r => [
      r.bill_name || '',
      r.category_name || '',
      `$${Number(r.bill_amount || 0).toFixed(2)}`,
      r.due_date || '',
      (r.payment_status || '').toUpperCase(),
      r.payment_date || '-',
      r.payment_method || '-',
      r.amount_paid ? `$${Number(r.amount_paid).toFixed(2)}` : '-'
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Bill Name', 'Category', 'Amount', 'Due Date', 'Status', 'Paid Date', 'Method', 'Paid Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="billmate-financial-report.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return res.status(500).json({ success: false, message: 'Server error generating PDF.' });
  }
};
