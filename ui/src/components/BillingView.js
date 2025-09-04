import React, { useState, useMemo } from 'react';
import { FileUp, Info, FileDown } from 'lucide-react';
import { formatCurrency } from '../utils.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const BillingView = ({ billingData = [], selectedYear, setSelectedYear, platformFilter, userRole, token, onUploadSuccess }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedMonthUpload, setSelectedMonthUpload] = useState('');
  const [selectedYearUpload, setSelectedYearUpload] = useState(new Date().getFullYear());
  const [uploadStatus, setUploadStatus] = useState('');
  const [newProjects, setNewProjects] = useState([]);

  const handleBillingUpload = async () => {
    if (!uploadFile) {
      setUploadStatus('Please select a file first.');
      return;
    }
    if (!selectedMonthUpload) {
        setUploadStatus('Please select a month for the upload.');
        return;
    }
    setUploadStatus('Uploading...');
    setNewProjects([]);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('month', selectedMonthUpload);
    formData.append('year', selectedYearUpload);
    formData.append('platform', platformFilter);

    try {
      const response = await fetch(`${API_BASE_URL}/billing/upload_csv`, { 
        method: 'POST', 
        headers: { 'x-access-token': token },
        body: formData 
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setUploadStatus(result.message);
      if (result.new_projects && result.new_projects.length > 0) {
        setNewProjects(result.new_projects);
      }
      
      document.getElementById('billing-file-input').value = "";
      
      if (onUploadSuccess) {
          onUploadSuccess();
      }

    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  };

  const processedBillingData = useMemo(() => {
    return billingData
      .filter(item => item.billing_year === selectedYear)
      .map(item => ({
        ...item,
        total_cost: months.reduce((sum, month) => sum + parseFloat(item[`${month}_cost`] || 0), 0)
      }))
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [billingData, selectedYear]);

  // NEW: Handler for exporting data to CSV
  const handleExportCSV = () => {
    const headers = ['Project Name', ...months.map(m => m.toUpperCase()), 'Total'];
    
    const rows = processedBillingData.map(project => {
        const rowData = [
            `"${project.project_name.replace(/"/g, '""')}"`, // Escape quotes
            ...months.map(month => project[`${month}_cost`] || 0)
        ];
        rowData.push(project.total_cost);
        return rowData.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_overview_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {(userRole === 'admin' || userRole === 'superuser') && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Upload Monthly Billing Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <input id="billing-file-input" type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="md:col-span-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            <select value={selectedMonthUpload} onChange={(e) => setSelectedMonthUpload(e.target.value)} className="p-3 border border-gray-300 rounded-lg">
              <option value="">Choose...</option>
              {months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <select value={selectedYearUpload} onChange={(e) => setSelectedYearUpload(parseInt(e.target.value))} className="p-3 border border-gray-300 rounded-lg">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleBillingUpload} disabled={platformFilter === 'all' || !platformFilter} className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              <FileUp size={20}/><span>Upload for {platformFilter}</span>
            </button>
          </div>
          {uploadStatus && <p className="mt-4 text-center text-sm text-gray-600">{uploadStatus}</p>}
          {newProjects.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                            The following new projects were discovered and added to the database:
                        </p>
                        <div className="mt-2 text-sm text-green-700">
                            <ul className="list-disc pl-5 space-y-1">
                                {newProjects.map(proj => <li key={proj}>{proj}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">Monthly Billing Overview</h3>
            <div className="flex items-center gap-4">
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-lg">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* NEW: Export to CSV Button */}
              <button onClick={handleExportCSV} className="p-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                <FileDown size={18} /> Export CSV
              </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Project Name</th>
                {months.map(month => 
                    <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase transition-colors">
                        {month.toUpperCase()}
                    </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedBillingData.map(row => (
                <tr key={row.project_name}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 bg-white">{row.project_name}</td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap transition-colors">
                        {formatCurrency(row[`${month}_cost`] || 0)}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap font-bold sticky right-0 bg-white">{formatCurrency(row.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingView;

