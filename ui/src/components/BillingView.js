import React, { useState, useMemo } from 'react';
import { FileUp } from 'lucide-react';
import { formatCurrency } from '../utils.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const BillingView = ({ billingData = [], selectedYear, platformFilter }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedMonthUpload, setSelectedMonthUpload] = useState(months[new Date().getMonth()]);
  const [selectedYearUpload, setSelectedYearUpload] = useState(new Date().getFullYear());
  const [uploadStatus, setUploadStatus] = useState('');

  const handleBillingUpload = async () => {
    if (!uploadFile) {
      setUploadStatus('Please select a file first.');
      return;
    }
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('month', selectedMonthUpload);
    formData.append('year', selectedYearUpload);
    formData.append('platform', platformFilter);

    try {
      const response = await fetch(`${API_BASE_URL}/billing/upload_csv`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUploadStatus(`${result.message} Please refresh the page to see updated data.`);
      document.getElementById('billing-file-input').value = "";
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  };

  const processedBillingData = useMemo(() => {
    return billingData
      .map(item => ({
        ...item,
        total_cost: months.reduce((sum, month) => sum + parseFloat(item[`${month}_cost`] || 0), 0)
      }))
      .sort((a, b) => b.total_cost - a.total_cost);
  }, [billingData]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Upload Monthly Billing Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input id="billing-file-input" type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="md:col-span-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
          <select value={selectedMonthUpload} onChange={(e) => setSelectedMonthUpload(e.target.value)} className="p-3 border border-gray-300 rounded-lg">
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
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Monthly Billing Overview for {selectedYear}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                {months.map(month => <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{month.toUpperCase()}</th>)}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedBillingData.map(row => (
                <tr key={row.project_name}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{row.project_name}</td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap">{formatCurrency(row[`${month}_cost`] || 0)}</td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap font-bold">{formatCurrency(row.total_cost)}</td>
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