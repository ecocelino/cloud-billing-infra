import React, { useState, useEffect } from 'react';
import { Cloud, LayoutDashboard, FolderOpen, BarChart3, LogOut } from 'lucide-react';
import './index.css';
import LoginPage from './components/LoginPage.js';
import DashboardView from './components/DashboardView.js';
import ProjectsView from './components/ProjectsView.js';
import BillingView from './components/BillingView.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  throw new Error("FATAL ERROR: REACT_APP_API_URL is not defined. Please check your .env file and restart your containers.");
}

const useYearlyBillingData = (platform, year) => {
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      if (!platform || !year || platform === 'all') {
        setProcessedData([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/billing/services?platform=${platform}&year=${year}`);
        const rawData = await response.json();

        // --- DEBUG LOG 1: Check the raw data from the API ---
        console.log("1. Raw data received from API:", rawData);

        if (!Array.isArray(rawData)) {
            setProcessedData([]);
            return;
        }

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const renameMonthIndex = 4;
        const transferMonthIndex = 5;
        const transferYear = 2025;

        const transformedData = rawData.map(item => {
            let targetProjectName = item.project_name;
            const monthIndex = months.indexOf(item.billing_month);
            if (item.project_name === '[Charges not specific to a project]') {
                if (year < transferYear || (year === transferYear && monthIndex <= renameMonthIndex)) {
                    targetProjectName = 'Netenrich Resolution Intelligence Cloud';
                } else if (year > transferYear || (year === transferYear && monthIndex >= transferMonthIndex)) {
                    targetProjectName = 'ai-research-and-development';
                }
            }
            return { ...item, project_name: targetProjectName };
        });

        const projects = {};
        transformedData.forEach(item => {
            const projectName = item.project_name;
            if (!projects[projectName]) {
                projects[projectName] = { 
                    project_name: projectName, platform: item.platform,
                    billing_year: item.billing_year, service_breakdown: [] 
                };
                months.forEach(m => { projects[projectName][`${m}_cost`] = 0; });
            }
            projects[projectName].service_breakdown.push(item);
            const itemMonth = item.billing_month;
            if (itemMonth && months.includes(itemMonth)) {
                 projects[projectName][`${itemMonth}_cost`] += parseFloat(item.cost || 0);
            }
        });
        
        const finalData = Object.values(projects);

        // --- DEBUG LOG 2: Check the final data before it's sent to the components ---
        console.log("2. Processed data being sent to components:", finalData);
        setProcessedData(finalData);

      } catch (error) {
        console.error("Failed to process billing data:", error);
        setProcessedData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataAndProcess();
  }, [platform, year]);

  return { yearlyBillingData: processedData, isBillingLoading: isLoading };
};


const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [view, setView] = useState('projects');
  const [platformFilter, setPlatformFilter] = useState('GCP');
  const [envFilter, setEnvFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const { yearlyBillingData, isBillingLoading } = useYearlyBillingData(platformFilter, selectedYear);
  
  const handleLogin = (username, password) => {
    if (username === 'admin' && password === 'password') {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid username or password.');
    }
  };
  const handleLogout = () => { setIsLoggedIn(false); };
  
  const AppContent = () => (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <nav className="w-64 bg-white p-4 shadow-lg flex flex-col">
        <div className="flex items-center space-x-2 mb-10 px-2">
          <Cloud size={40} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Cloud Cost System</h1>
        </div>
        <div className="flex flex-col space-y-2">
          <button onClick={() => setView('dashboard')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><LayoutDashboard size={20} /><span>Dashboard</span></button>
          <button onClick={() => setView('projects')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'projects' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><FolderOpen size={20} /><span>Projects</span></button>
          <button onClick={() => setView('billing')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'billing' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><BarChart3 size={20} /><span>Billing</span></button>
        </div>
        <button onClick={handleLogout} className="mt-auto flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-red-100 hover:text-red-600"><LogOut size={20} /><span>Logout</span></button>
      </nav>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <main className="max-w-7xl mx-auto">
          {isBillingLoading && <div className="text-center p-10 font-semibold text-gray-500">Loading Billing Data...</div>}
          {!isBillingLoading && view === 'dashboard' && <DashboardView inventory={yearlyBillingData} initialYear={selectedYear} setSelectedYear={setSelectedYear} />}
          {!isBillingLoading && view === 'projects' && <ProjectsView yearlyData={yearlyBillingData} initialYear={selectedYear} envFilter={envFilter} />}
          {!isBillingLoading && view === 'billing' && <BillingView billingData={yearlyBillingData} selectedYear={selectedYear} platformFilter={platformFilter}/>}
        </main>
      </div>
    </div>
  );
  
  return isLoggedIn ? <AppContent /> : <LoginPage onLogin={handleLogin} error={error} />;
};
export default App;