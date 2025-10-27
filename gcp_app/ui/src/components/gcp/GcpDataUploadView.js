import React, { useState, useContext, useEffect } from 'react';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import { FileUp, Loader2, Info, CheckCircle, XCircle } from 'lucide-react';
import Papa from 'papaparse';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const GcpDataUploadView = () => {
    const { token, triggerRefetch } = useContext(GlobalStateContext);
    const [uploadFile, setUploadFile] = useState(null);
    const [selectedMonthUpload, setSelectedMonthUpload] = useState('');
    const [selectedYearUpload, setSelectedYearUpload] = useState(new Date().getFullYear());
    const [uploadStatus, setUploadStatus] = useState({ message: '', type: 'idle' });
    const [newProjects, setNewProjects] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
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
                      const foundMonth = months[fileMonthIndex]?.charAt(0).toUpperCase() + months[fileMonthIndex]?.slice(1);
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
    formData.append('platform', 'GCP');

    try {
      const response = await fetch(`/api/billing/upload_csv`, { 
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
      
      if (triggerRefetch) {
          triggerRefetch();
      }
    } catch (err) {
      setUploadStatus({ message: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'loading': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <FileUp className="mr-3" /> Data Upload
        </h1>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Upload GCP Billing Report</h3>
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
                    {isUploading ? ( <> <Loader2 size={20} className="animate-spin"/> <span>Uploading...</span> </> ) : ( <> <FileUp size={20}/> <span>Upload for GCP</span> </> )}
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
    </div>
  );
};

export default GcpDataUploadView;