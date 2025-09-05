import React, { useState, useEffect } from 'react';
import { Cloud, LayoutDashboard, FolderOpen, BarChart3, LogOut, Settings, Filter } from 'lucide-react';
import './index.css';
import LoginPage from './components/LoginPage.js';
import DashboardView from './components/DashboardView.js';
import ProjectsView from './components/ProjectsView.js';
import BillingView from './components/BillingView.js';
import SettingsView from './components/SettingsView.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  throw new Error("FATAL ERROR: REACT_APP_API_URL is not defined. Please check your .env file and restart your containers.");
}

const useYearlyBillingData = (platform, year, token, dataVersion) => {
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      if (!platform || !year || !token) {
        setProcessedData([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [billingResponse, metaResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/billing/services?platform=${platform}&year=${year}`, { headers: { 'x-access-token': token } }),
            fetch(`${API_BASE_URL}/projects/meta/all`, { headers: { 'x-access-token': token } })
        ]);

        const rawData = await billingResponse.json();
        const metaData = await metaResponse.json();
        
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
            const servicesToMove = ['Cloud IDS', 'Cloud NGFW Enterprise Endpoint Uptime'];
            if (item.project_name === 'multisys-hostnet-prod-1' && servicesToMove.includes(item.service_description)) {
                targetProjectName = 'ms-multipay-prod-1';
            }
            return { ...item, project_name: targetProjectName };
        });

        const projects = {};
        transformedData.forEach(item => {
            const projectName = item.project_name;
            if (!projects[projectName]) {
                projects[projectName] = { 
                    project_name: projectName,
                    platform: item.platform,
                    billing_year: item.billing_year,
                    service_breakdown: [] 
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

        finalData.forEach(project => {
            if (metaData[project.project_name]) {
                project.project_code = metaData[project.project_name].projectCode;
            } else {
                project.project_code = '';
            }
        });

        setProcessedData(finalData);

      } catch (error) {
        console.error("Failed to process billing data:", error);
        setProcessedData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataAndProcess();
  }, [platform, year, token, dataVersion]);

  return { yearlyBillingData: processedData, isBillingLoading: isLoading };
};


const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [view, setView] = useState('dashboard');
  const [platformFilter, setPlatformFilter] = useState('GCP');
  const [envFilter, setEnvFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  
  const [dataVersion, setDataVersion] = useState(0);
  const triggerRefetch = () => setDataVersion(v => v + 1);

  const { yearlyBillingData, isBillingLoading } = useYearlyBillingData(platformFilter, selectedYear, token, dataVersion);

  // ✅ Load token/role from localStorage on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedRole = localStorage.getItem("userRole");
    if (savedToken && savedRole) {
      setToken(savedToken);
      setUserRole(savedRole);
      setIsLoggedIn(true);
    }
  }, []);
  
  const handleLogin = async (username, password) => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUserRole(data.role);
        setIsLoggedIn(true);
        // ✅ Save to localStorage
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userRole", data.role);
      } else {
        const result = await response.json();
        setError(result.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Login failed. Please ensure the backend is running.');
    }
  };
  
  const handleLogout = () => {
    setToken(null);
    setUserRole(null); 
    setIsLoggedIn(false); 
    // ✅ Clear from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
  };
  
  const AppContent = () => (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <nav className="w-64 bg-white p-4 shadow-lg flex flex-col sticky top-0 h-screen">
        <div className="flex items-center space-x-2 mb-10 px-2">
          <Cloud size={40} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Cloud Cost System</h1>
        </div>
        <div className="flex flex-col space-y-2">
          <button onClick={() => setView('dashboard')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><LayoutDashboard size={20} /><span>Dashboard</span></button>
          <button onClick={() => setView('projects')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'projects' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><FolderOpen size={20} /><span>Projects</span></button>
          <button onClick={() => setView('billing')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'billing' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><BarChart3 size={20} /><span>Billing</span></button>
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <button onClick={() => setView('settings')} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${view === 'settings' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><Settings size={20} /><span>Settings</span></button>
          )}
        </div>
        <button onClick={handleLogout} className="mt-auto flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-red-100 hover:text-red-600"><LogOut size={20} /><span>Logout</span></button>
      </nav>

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <header className="flex items-center bg-white p-4 rounded-xl shadow-md mb-6 no-print">
            <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">Global Filters</h2>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="p-2 border border-gray-300 rounded-full focus:outline-none text-sm">
                  <option value="all">All Environments</option>
                  <option value="prod">Production</option>
                  <option value="nonprod">Non-Production</option>
              </select>
            </div>
        </header>

        <main>
          {isBillingLoading && view !== 'settings' && <div className="text-center p-10 font-semibold text-gray-500">Loading Billing Data...</div>}
          
          {!isBillingLoading && view === 'dashboard' && <DashboardView inventory={yearlyBillingData} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
          
          {!isBillingLoading && view === 'projects' && <ProjectsView yearlyData={yearlyBillingData} selectedYear={selectedYear} setSelectedYear={setSelectedYear} envFilter={envFilter} userRole={userRole} token={token} />}
          
          {!isBillingLoading && view === 'billing' && <BillingView billingData={yearlyBillingData} selectedYear={selectedYear} setSelectedYear={setSelectedYear} platformFilter={platformFilter} userRole={userRole} token={token} onUploadSuccess={triggerRefetch}/>}
          
          {view === 'settings' && <SettingsView token={token} currentUserRole={userRole} />}
        </main>
      </div>
    </div>
  );
  
  return isLoggedIn ? <AppContent /> : <LoginPage onLogin={handleLogin} error={error} />;
};
export default App;