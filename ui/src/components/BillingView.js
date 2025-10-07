import React, { useState, useMemo, useContext, useEffect } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { FileUp, Info, FileDown, Loader2, ArrowUpDown, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils.js';
import Papa from 'papaparse';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const getHeatmapColor = (value, min, max, isDarkMode) => {
  if (value === 0 || max === min) {
    return isDarkMode ? 'rgb(31 41 55)' : '#ffffff'; // gray-800 for dark, white for light
  }
  const percentage = (value - min) / (max - min);
  
  if (isDarkMode) {
    const lightness = 20 + (percentage * 35); // Dark blue to lighter blue
    return `hsl(221, 83%, ${lightness}%)`;
  } else {
    const lightness = 95 - (percentage * 50); // White to darker blue
    return `hsl(221, 83%, ${lightness}%)`;
  }
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

  const [isFileValidated, setIsFileValidated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (uploadStatus.message && uploadStatus.type !== 'loading') {
        const timer = setTimeout(() => {
            setUploadStatus({ message: '', type: 'idle' });
        }, 5000);

        return () => clearTimeout(timer);
    }
  }, [uploadStatus]);
  
  const handleFileSelect = (event) => {
      const file = event.target.files[0];
      setUploadFile(file);
      setIsFileValidated(false);
      setValidationError('');

      if (!file) return;
      if (!selectedMonthUpload || !selectedYearUpload) {
          setValidationError('Please select a month and year before choosing a file.');
          return;
      }
      
      setIsParsing(true);
      Papa.parse(file, {
          preview: 10,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
              const dateColumn = 'Usage start date';
              if (!results.meta.fields.includes(dateColumn)) {
                  setValidationError(`CSV must contain a "${dateColumn}" column.`);
                  setIsParsing(false);
                  return;
              }

              const selectedMonthIndex = months.indexOf(selectedMonthUpload);
              
              let prevMonthIndex = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1;
              let prevYear = selectedMonthIndex === 0 ? selectedYearUpload - 1 : selectedYearUpload;

              for (const row of results.data) {
                  const usageDate = new Date(row[dateColumn]);
                  if (isNaN(usageDate.getTime())) continue;

                  const fileMonthIndex = usageDate.getMonth();
                  const fileYear = usageDate.getFullYear();
                  
                  const isCurrentMonth = fileYear === selectedYearUpload && fileMonthIndex === selectedMonthIndex;
                  const isPreviousMonth = fileYear === prevYear && fileMonthIndex === prevMonthIndex;

                  if (!isCurrentMonth && !isPreviousMonth) {
                      const expectedMonth = selectedMonthUpload.charAt(0).toUpperCase() + selectedMonthUpload.slice(1);
                      const foundMonth = months[fileMonthIndex].charAt(0).toUpperCase() + months[fileMonthIndex].slice(1);
                      setValidationError(`File contains data for ${foundMonth} ${fileYear}. Please upload a file for ${expectedMonth} ${selectedYearUpload}.`);
                      setIsParsing(false);
                      return;
                  }
              }

              setIsFileValidated(true);
              setIsParsing(false);
          }
      });
  };

  const handleBillingUpload = async () => {
    if (!uploadFile || !isFileValidated) {
      setUploadStatus({ message: 'Please select and validate a file first.', type: 'error' });
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
      const response = await fetch(`${API_BASE_URL}/billing/upload_csv`, { 
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
      setIsFileValidated(false);
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

    const grandTotal = {
        project_name: 'Grand Total',
        total_cost: 0
    };
    months.forEach(month => {
        const monthKey = `${month}_cost`;
        const monthlyTotal = dataWithTotals.reduce((sum, project) => sum + (project[monthKey] || 0), 0);
        grandTotal[monthKey] = monthlyTotal;
        grandTotal.total_cost += monthlyTotal;
    });

    return { data: dataWithTotals, minCost, maxCost, grandTotal };
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

    rows.push('');

    const grandTotal = processedBillingData.grandTotal;
    const grandTotalRowData = [
        `"${grandTotal.project_name}"`,
        ...months.map(month => grandTotal[`${month}_cost`] || 0)
    ];
    grandTotalRowData.push(grandTotal.total_cost);
    rows.push(grandTotalRowData.join(','));

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
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'loading': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-6">
      {(userRole === 'admin' || userRole === 'superadmin') && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Upload Monthly Billing Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
                <input id="billing-file-input" type="file" accept=".csv" onChange={handleFileSelect} className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60"/>
                {isParsing && <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /><span>Verifying file...</span></div>}
                {validationError && <div className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-2"><XCircle size={16} /><span>{validationError}</span></div>}
                {isFileValidated && <div className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2"><CheckCircle size={16} /><span>File verified.</span></div>}
            </div>
            <select value={selectedMonthUpload} onChange={(e) => { setSelectedMonthUpload(e.target.value); setUploadFile(null); setIsFileValidated(false); setValidationError(''); document.getElementById('billing-file-input').value = ""; }} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
              <option value="">Choose Month...</option>
              {months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <select value={selectedYearUpload} onChange={(e) => { setSelectedYearUpload(parseInt(e.target.value)); setUploadFile(null); setIsFileValidated(false); setValidationError(''); document.getElementById('billing-file-input').value = ""; }} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleBillingUpload} disabled={!isFileValidated || isUploading} className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
              {isUploading ? ( <> <Loader2 size={20} className="animate-spin"/> <span>Uploading...</span> </> ) : ( <> <FileUp size={20}/> <span>Upload for {platformFilter}</span> </> )}
            </button>
          </div>
          {uploadStatus.message && <p className={`mt-4 text-center text-sm font-medium ${getStatusColor(uploadStatus.type)}`}>{uploadStatus.message}</p>}
          {newProjects.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/40 border-l-4 border-green-400 dark:border-green-600">
              <div className="flex">
                <div className="flex-shrink-0"><Info className="h-5 w-5 text-green-400 dark:text-green-500" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">New projects discovered and added:</p>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <ul className="list-disc pl-5 space-y-1">{newProjects.map(proj => <li key={proj}>{proj}</li>)}</ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg printable-content">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Monthly Billing Overview</h3>
            <div className="flex items-center gap-4">
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={handleExportCSV} disabled={processedBillingData.data.length === 0} className="p-2 bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                <FileDown size={18} /> Export CSV
              </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          {processedBillingData.data.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">No billing data found for {selectedYear}.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th onClick={() => requestSort('project_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center gap-2">Project Name <ArrowUpDown size={14} /></div>
                  </th>
                  {months.map(month => 
                      <th key={month} onClick={() => requestSort(`${month}_cost`)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                          <div className="flex items-center gap-2">{month.toUpperCase()} <ArrowUpDown size={14} /></div>
                      </th>
                  )}
                  <th onClick={() => requestSort('total_cost')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky right-0 bg-gray-50 dark:bg-gray-700 z-10 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center gap-2">Total <ArrowUpDown size={14} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {processedBillingData.data.map(row => (
                  <tr key={row.project_name}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{row.project_name}</td>
                    {months.map(month => {
                      const cost = row[`${month}_cost`] || 0;
                      const bgColor = getHeatmapColor(cost, processedBillingData.minCost, processedBillingData.maxCost, isDarkMode);
                      const textColorClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
                      return (
                          <td key={month} className={`px-6 py-4 whitespace-nowrap ${textColorClass}`} style={{ backgroundColor: bgColor }}>
                              {formatCurrency(cost)}
                          </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap font-bold sticky right-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{formatCurrency(row.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-100">
                <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-right sticky left-0 bg-gray-100 dark:bg-gray-700">{processedBillingData.grandTotal.project_name}</td>
                    {months.map(month => (
                        <td key={month} className="px-6 py-4 whitespace-nowrap">
                            {formatCurrency(processedBillingData.grandTotal[`${month}_cost`] || 0)}
                        </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-gray-100 dark:bg-gray-700">{formatCurrency(processedBillingData.grandTotal.total_cost)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingView;