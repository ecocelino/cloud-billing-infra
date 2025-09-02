import React, { useState, useEffect, useMemo } from 'react';
import { Cloud, LayoutDashboard, FolderOpen, List, BarChart3, LogOut } from 'lucide-react';
import './index.css';
import LoginPage from './components/LoginPage.js';
import DashboardView from './components/DashboardView.js';
import ProjectsView from './components/ProjectsView.js';
import BillingView from './components/BillingView.js';
import InventoryView from './components/InventoryView.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  throw new Error("FATAL ERROR: REACT_APP_API_URL is not defined. Please check your .env file and restart your containers.");
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [view, setView] = useState('dashboard');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [newResource, setNewResource] = useState({ project_name: '', awsAccount: '', awsAccountAlias: '', type: '', name: '', region: '', cost: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleLogin = (username, password) => { if (username === 'admin' && password === 'password') { setIsLoggedIn(true); setError(''); } else { setError('Invalid username or password.'); } };
  const handleLogout = () => { setIsLoggedIn(false); setInventory([]); setView('dashboard'); };
  const handleInputChange = (e) => { const { name, value } = e.target; setNewResource({ ...newResource, [name]: name === 'cost' ? parseFloat(value) : value }); };
  
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inventory`);
      let data = await response.json();
      if(Array.isArray(data)){
        const sanitizedData = data.map(item => ({...item, cost: parseFloat(item.cost) || 0 }));
        setInventory(sanitizedData);
      } else {
        setInventory([]);
      }
    } catch (err) { setError('Failed to load inventory.'); } finally { setLoading(false); }
  };

  useEffect(() => { if (isLoggedIn) fetchInventory(); }, [isLoggedIn]);

  useEffect(() => {
    const sum = inventory.reduce((acc, resource) => acc + resource.cost, 0);
    setTotalCost(sum);
  }, [inventory]);
  
  const handleAddResource = async () => {
    const resourceWithPlatform = { ...newResource, platform: platformFilter };
    const requiredFields = platformFilter === 'AWS' ? ['platform', 'project_name', 'awsAccount', 'awsAccountAlias', 'type', 'name', 'region', 'cost'] : ['platform', 'project_name', 'type', 'name', 'cost'];
    if (!requiredFields.every(field => resourceWithPlatform[field])) { setError('Please fill out all required fields.'); return; }
    setError('');
    try {
      await fetch(`${API_BASE_URL}/inventory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resourceWithPlatform) });
      setNewResource({ project_name: '', awsAccount: '', awsAccountAlias: '', type: '', name: '', region: '', cost: '' });
      fetchInventory();
    } catch (err) { setError('Failed to add resource. Check backend connection.'); }
  };

  const handleDeleteResource = async (id, platform) => {
    try { await fetch(`${API_BASE_URL}/inventory/${id}?platform=${platform}`, { method: 'DELETE' }); fetchInventory(); } catch (err) { setError('Failed to delete resource. Check backend connection.'); }
  };

  const handleFileUpload = async (e, platform) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE_URL}/inventory/upload_gcp_csv`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to upload and process file.');
        alert(result.message);
        fetchInventory();
    } catch (err) { setError(err.message); }
    document.getElementById('csv-upload').value = null;
  };

  const sortedInventory = useMemo(() => {
    return [...inventory]
      .filter(resource => platformFilter === 'all' || resource.platform === platformFilter)
      .sort((a, b) => {
        if (!sortColumn) return 0;
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [inventory, platformFilter, sortColumn, sortDirection]);
  
  const AppContent = () => (
    <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0"><Cloud size={40} className="text-blue-600" /><h1 className="text-3xl font-bold text-gray-900">Cloud Inventory & Cost System</h1></div>
          <nav className="flex flex-wrap items-center justify-center space-x-2 bg-white rounded-full p-2 shadow-md">
            <button onClick={() => setView('dashboard')} className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><LayoutDashboard size={20} /><span>Dashboard</span></button>
            <button onClick={() => setView('projects')} className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${view === 'projects' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><FolderOpen size={20} /><span>Projects</span></button>
            <button onClick={() => { setView('inventory'); setPlatformFilter('AWS'); }} className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${view === 'inventory' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><List size={20} /><span>Inventory</span></button>
            <button onClick={() => setView('billing')} className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-colors ${view === 'billing' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}><BarChart3 size={20} /><span>Billing</span></button>
            <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 rounded-full font-medium text-gray-700 hover:bg-red-100 hover:text-red-600"><LogOut size={20} /><span>Logout</span></button>
          </nav>
        </header>
        <main>
          <div className="flex justify-center items-center mb-6 space-x-4">
            <button onClick={() => setPlatformFilter('all')} className={`px-4 py-2 rounded-full font-medium transition-colors ${platformFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-slate-200'}`}>All Platforms</button>
            <button onClick={() => setPlatformFilter('AWS')} className={`px-4 py-2 rounded-full font-medium transition-colors ${platformFilter === 'AWS' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-slate-200'}`}>AWS</button>
            <button onClick={() => setPlatformFilter('GCP')} className={`px-4 py-2 rounded-full font-medium transition-colors ${platformFilter === 'GCP' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-slate-200'}`}>GCP</button>
            <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="p-2 border border-gray-300 rounded-full focus:outline-none">
                <option value="all">All Environments</option>
                <option value="prod">Production</option>
                <option value="nonprod">Non-Production</option>
            </select>
          </div>
          {view === 'dashboard' && <DashboardView inventory={inventory} totalCost={totalCost} />}
          {view === 'projects' && <ProjectsView inventory={inventory} platformFilter={platformFilter} envFilter={envFilter} />}
          {view === 'inventory' && <InventoryView platformFilter={platformFilter} newResource={newResource} handleInputChange={handleInputChange} handleAddResource={handleAddResource} handleFileUpload={handleFileUpload} sortedInventory={sortedInventory} handleDeleteResource={handleDeleteResource} error={error} loading={loading} />}
          {view === 'billing' && <BillingView platformFilter={platformFilter} envFilter={envFilter} />}
        </main>
      </div>
    </div>
  );
  
  return isLoggedIn ? <AppContent /> : <LoginPage onLogin={handleLogin} error={error} />;
};

export default App;