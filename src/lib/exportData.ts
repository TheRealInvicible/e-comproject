import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(dataBlob, \`\${fileName}-\${new Date().toISOString().split('T')[0]}.xlsx\`);
};

export const exportToCsv = (data: any[], fileName: string) => {
  const replacer = (key: string, value: any) => value === null ? '' : value;
  const header = Object.keys(data[0]);
  const csv = [
    header.join(','),
    ...data.map(row => header.map(fieldName => 
      JSON.stringify(row[fieldName], replacer)).join(','))
  ].join('\\r\\n');

  const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(dataBlob, \`\${fileName}-\${new Date().toISOString().split('T')[0]}.csv\`);
};

export const exportToPdf = async (data: any[], fileName: string) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(fileName, 20, 20);
  
  // Add date
  doc.setFontSize(12);
  doc.text(\`Generated on: \${new Date().toLocaleDateString()}\`, 20, 30);
  
  // Add table
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => item[header]));
  
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 40,
    margin: { top: 40 }
  });
  
  doc.save(\`\${fileName}-\${new Date().toISOString().split('T')[0]}.pdf\`);
};