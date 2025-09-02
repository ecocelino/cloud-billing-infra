import React, { useState, useEffect, useMemo } from 'react';
import { FileUp, ChevronUp, ChevronDown } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const formatCurrency = (number) => {
    if (typeof number !== 'number') { number = 0; }
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const BillingView = ({ platformFilter, envFilter }) => {
  const [billingData, setBillingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'total_cost', direction: 'descending' });
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedMonthUpload, setSelectedMonthUpload] = useState('jul');
  const [selectedYearUpload, setSelectedYearUpload] = useState(new Date().getFullYear());
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/billing?platform=${platformFilter}`);
      let rawData = await response.json();

      if (Array.isArray(rawData)) {
        // Normalize keys from the server to handle spaces and casing (e.g., 'Project name' -> 'project_name')
        const data = rawData.map(rawItem => {
          const newItem = {};
          for (const key in rawItem) {
            const cleanedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            newItem[cleanedKey] = rawItem[key];
          }
          return newItem;
        });

        let aiRow = null;
        let otherRows = [];
        let chargesNotSpecificToProject = [];
        let duetChargesRows = [];

        data.forEach(item => {
          if (item.project_name === 'ai-research-and-development') {
            aiRow = { ...item };
          } else if (item.project_name === '[Charges not specific to a project]') {
            if ((item.service_description || '').toLowerCase().includes('duet ai')) {
              duetChargesRows.push(item);
            } else {
              chargesNotSpecificToProject.push(item);
            }
          } else {
            otherRows.push(item);
          }
        });

        if (duetChargesRows.length > 0) {
          if (!aiRow) {
            aiRow = { ...duetChargesRows[0], project_name: 'ai-research-and-development' };
            months.forEach(month => { aiRow[`${month}_cost`] = 0; });
          }
          duetChargesRows.forEach(row => {
            months.forEach(month => {
              aiRow[`${month}_cost`] = parseFloat(aiRow[`${month}_cost`] || 0) + parseFloat(row[`${month}_cost`] || 0);
            });
          });
        }
        
        let combinedData = [];
        if (aiRow) {
          combinedData.push(aiRow);
        }
        combinedData = [...combinedData, ...otherRows, ...chargesNotSpecificToProject];
        
        const processed = combinedData.map(item => {
            if (item.project_name === '[Charges not specific to a project]') {
                return { ...item, project_name: 'Netenrich Resolution Intelligence Cloud' };
            }
            return item;
        });
        
        setBillingData(processed);

      } else { 
        setBillingData([]); 
      }
    } catch (err) { 
      setUploadStatus(`Error fetching data: ${err.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchBillingData(); }, [platformFilter]);
  
  const handleBillingUpload = async () => {
    if (!uploadFile) { setUploadStatus('Please select a file first.'); return; }
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
      setUploadStatus(result.message);
      document.getElementById('billing-file-input').value = "";
      setSortConfig({ key: `${selectedMonthUpload}_cost`, direction: 'descending' });

      // **FIX:** Delay the fetch to allow the backend to finish processing the uploaded file.
      setTimeout(() => {
        fetchBillingData();
      }, 1500); // 1.5-second delay

    } catch (err) { setUploadStatus(`Error: ${err.message}`); }
  };

  const processedBillingData = useMemo(() => {
    const filteredByEnv = billingData.filter(item => {
      if (envFilter === 'all') return true;
      if (envFilter === 'prod') return item.project_name.includes('-prod');
      if (envFilter === 'nonprod') return item.project_name.includes('-nonprod');
      return true;
    });

    const withTotals = filteredByEnv.filter(d => d.billing_year === selectedYear)
      .map(item => ({
        ...item,
        total_cost: months.reduce((sum, month) => sum + parseFloat(item[`${month}_cost`] || 0), 0)
      }));

    if (sortConfig.key !== null) {
      withTotals.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? -1 : 1; }
        if (a[sortConfig.key] > b[sortConfig.key]) { return sortConfig.direction === 'ascending' ? 1 : -1; }
        return 0;
      });
    }
    return withTotals;
  }, [billingData, sortConfig, envFilter, selectedYear]);

  const grandTotalRow = useMemo(() => {
    const totals = { id: 'grand-total', project_name: 'Grand Total' };
    months.forEach(month => {
        const monthKey = `${month}_cost`;
        totals[monthKey] = processedBillingData.reduce((sum, item) => sum + parseFloat(item[monthKey] || 0), 0);
    });
    totals.total_cost = processedBillingData.reduce((sum, item) => sum + item.total_cost, 0);
    return totals;
  }, [processedBillingData]);

  const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const getSortIcon = (name) => { if (sortConfig.key !== name) return null; return sortConfig.direction === 'ascending' ? <ChevronUp className="inline ml-1" size={16}/> : <ChevronDown className="inline ml-1" size={16}/>; };
  const years = [...new Set(billingData.map(item => item.billing_year))].sort((a,b) => b-a);
  const uploadYears = [2023, 2024, 2025, 2026, 2027];
  
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
            {uploadYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleBillingUpload} disabled={platformFilter === 'all'} className="flex items-center justify-center space-x-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            <FileUp size={20}/><span>Upload for {platformFilter}</span>
          </button>
        </div>
        {uploadStatus && <p className="mt-4 text-center text-sm text-gray-600">{uploadStatus}</p>}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">Monthly Billing Overview</h3>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-lg">{years.length > 0 ? years.map(y => <option key={y} value={y}>{y}</option>) : <option>{new Date().getFullYear()}</option>}</select>
        </div>
        {isLoading ? <p>Loading...</p> :
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>{months.map(month => (<th key={month} onClick={() => requestSort(`${month}_cost`)} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none ${selectedMonthUpload === month ? 'bg-blue-100' : ''}`}>{month} {getSortIcon(`${month}_cost`)}</th>))}<th onClick={() => requestSort('total_cost')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none">Total {getSortIcon('total_cost')}</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">{processedBillingData.map(row => (<tr key={row.id}><td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.project_name}</td>{months.map(month => (
              <td key={month} className={`px-6 py-4 whitespace-nowrap text-gray-700 ${selectedMonthUpload === month ? 'bg-blue-50' : ''}`}>
                {formatCurrency(parseFloat(row[`${month}_cost`] || 0))}
              </td>
            ))}<td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">{formatCurrency(row.total_cost)}</td></tr>))}</tbody>
            <tfoot className="bg-gray-100 font-bold"><tr><td className="px-6 py-4 whitespace-nowrap text-right text-gray-800">{grandTotalRow.project_name}</td>{months.map(month => (<td key={month} className="px-6 py-4 whitespace-nowrap text-green-700">{formatCurrency(grandTotalRow[`${month}_cost`])}</td>))}<td className="px-6 py-4 whitespace-nowrap text-green-800 font-extrabold">{formatCurrency(grandTotalRow.total_cost)}</td></tr></tfoot>
          </table>
        </div>
        }
      </div>
    </div>
  );
};

export default BillingView;