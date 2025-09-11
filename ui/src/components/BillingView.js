import React, { useState, useMemo, useContext, useEffect } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { FileUp, Info, FileDown, Loader2, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '../utils.js';

// --- REMOVED: API_BASE_URL is no longer needed here as it's handled by the context/environment ---
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const getHeatmapColor = (value, min, max) => {
  if (value === 0 || max === min) return '#ffffff'; 
  const percentage = (value - min) / (max - min);
  const lightness = 95 - (percentage * 50); 
  return `hsl(221, 83%, ${lightness}%)`;
};

const BillingView = () => {
  const { 
    yearlyBillingData: billingData, 
    selectedYear, 
    setSelectedYear, 
    platformFilter, 
    triggerRefetch: onUploadSuccess,
    token,
    userRole 
  } = useContext(GlobalStateContext);

  const [uploadFile, setUploadFile] = useState(null);
  const [selectedMonthUpload, setSelectedMonthUpload] = useState('');
  const [selectedYearUpload, setSelectedYearUpload] = useState(new Date().getFullYear());
  const [uploadStatus, setUploadStatus] = useState({ message: '', type: 'idle' });
  const [newProjects, setNewProjects] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'total_cost', direction: 'descending' });

  useEffect(() => {
    if (uploadStatus.message && uploadStatus.type !== 'loading') {
        const timer = setTimeout(() => {
            setUploadStatus({ message: '', type: 'idle' });
        }, 5000);

        return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const handleBillingUpload = async () => {
    if (!uploadFile) {
      setUploadStatus({ message: 'Please select a file first.', type: 'error' });
      return;
    }
    if (!selectedMonthUpload) {
      setUploadStatus({ message: 'Please select a month for the upload.', type: 'error' });
      return;
    }
    
    setIsUploading(true);
    setUploadStatus({ message: 'Uploading...', type: 'loading' });
    setNewProjects([]);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('month', selectedMonthUpload);
    formData.append('year', selectedYearUpload);
    formData.append('platform', platformFilter);

    try {
      // Note: The fetch URL now correctly uses the environment variable
      const response = await fetch(`${process.env.REACT_APP_API_URL}/billing/upload_csv`, { 
        method: 'POST', 
        headers: { 'x-access-token': token },
        body: formData 
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setUploadStatus({ message: result.message, type: 'success' });
      if (result.new_projects && result.new_projects.length > 0) {
        setNewProjects(result.new_projects);
      }
      
      setUploadFile(null);
      document.getElementById('billing-file-input').value = "";
      
      if (onUploadSuccess) {
          onUploadSuccess();
      }
    } catch (err) {
      setUploadStatus({ message: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const processedBillingData = useMemo(() => {
    let minCost = Infinity;
    let maxCost = -Infinity;

    const dataWithTotals = billingData
      .filter(item => item.billing_year === selectedYear)
      .map(item => {
        let total_cost = 0;
        months.forEach(month => {
            const cost = parseFloat(item[`${month}_cost`] || 0);
            total_cost += cost;
            if(cost > 0) {
              if (cost < minCost) minCost = cost;
              if (cost > maxCost) maxCost = cost;
            }
        });
        return { ...item, total_cost };
      });
      
    if (sortConfig.key) {
        dataWithTotals.sort((a, b) => {
            const aValue = (sortConfig.key === 'project_name') ? a[sortConfig.key] : (a[sortConfig.key] || 0);
            const bValue = (sortConfig.key === 'project_name') ? b[sortConfig.key] : (b[sortConfig.key] || 0);

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return { data: dataWithTotals, minCost, maxCost };
  }, [billingData, selectedYear, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleExportCSV = () => {
    const headers = ['Project Name', ...months.map(m => m.toUpperCase()), 'Total'];
    const rows = processedBillingData.data.map(project => {
        const rowData = [
            `"${project.project_name.replace(/"/g, '""')}"`,
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
  
  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'loading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {(userRole === 'admin' || userRole === 'superadmin') && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Upload Monthly Billing Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <input id="billing-file-input" type="file" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="md:col-span-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            <select value={selectedMonthUpload} onChange={(e) => setSelectedMonthUpload(e.target.value)} className="p-3 border border-gray-300 rounded-lg">
              <option value="">Choose Month...</option>
              {months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <select value={selectedYearUpload} onChange={(e) => setSelectedYearUpload(parseInt(e.target.value))} className="p-3 border border-gray-300 rounded-lg">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleBillingUpload} disabled={platformFilter === 'all' || !platformFilter || isUploading} className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isUploading ? (
                <>
                  <Loader2 size={20} className="animate-spin"/>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FileUp size={20}/>
                  <span>Upload for {platformFilter}</span>
                </>
              )}
            </button>
          </div>
          {uploadStatus.message && <p className={`mt-4 text-center text-sm font-medium ${getStatusColor(uploadStatus.type)}`}>{uploadStatus.message}</p>}
          {newProjects.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400">
              <div className="flex">
                <div className="flex-shrink-0"><Info className="h-5 w-5 text-green-400" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">New projects discovered and added:</p>
                  <div className="mt-2 text-sm text-green-700">
                    <ul className="list-disc pl-5 space-y-1">{newProjects.map(proj => <li key={proj}>{proj}</li>)}</ul>
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
              <button onClick={handleExportCSV} disabled={processedBillingData.data.length === 0} className="p-2 bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:bg-gray-400">
                <FileDown size={18} /> Export CSV
              </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          {processedBillingData.data.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No billing data found for {selectedYear}.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => requestSort('project_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-2">Project Name <ArrowUpDown size={14} /></div>
                  </th>
                  {months.map(month => 
                      <th key={month} onClick={() => requestSort(`${month}_cost`)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                          <div className="flex items-center gap-2">{month.toUpperCase()} <ArrowUpDown size={14} /></div>
                      </th>
                  )}
                  <th onClick={() => requestSort('total_cost')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-2">Total <ArrowUpDown size={14} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedBillingData.data.map(row => (
                  <tr key={row.project_name}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 bg-white">{row.project_name}</td>
                    {months.map(month => {
                      const cost = row[`${month}_cost`] || 0;
                      const bgColor = getHeatmapColor(cost, processedBillingData.minCost, processedBillingData.maxCost);
                      return (
                          <td key={month} className="px-6 py-4 whitespace-nowrap" style={{ backgroundColor: bgColor }}>
                              {formatCurrency(cost)}
                          </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap font-bold sticky right-0 bg-white">{formatCurrency(row.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingView;

