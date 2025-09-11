import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Cloud, LayoutDashboard, FolderOpen, BarChart3, LogOut, Settings, Filter, Tag, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { GlobalStateProvider, GlobalStateContext } from './context/GlobalStateContext';

// Component Imports
import LoginPage from './components/LoginPage';
import DashboardView from './components/DashboardView';
import ProjectsView from './components/ProjectsView';
import BillingView from './components/BillingView';
import SettingsView from './components/SettingsView';
import PricingView from './components/PricingView';

// The Sidebar now gets its state from the context
const Sidebar = () => {
    const { isSidebarCollapsed, setIsSidebarCollapsed, userRole, logout } = useContext(GlobalStateContext);
    const [isPricingMenuOpen, setIsPricingMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handlePricingNavigation = (tier) => {
        navigate(`/pricing/${tier}`);
    };

    const navLinkClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100";
    const activeLinkClasses = "bg-blue-500 text-white";

    return (
        <nav className={`bg-white p-4 shadow-lg flex flex-col sticky top-0 h-screen transition-all duration-300 relative z-10 ${isSidebarCollapsed ? 'w-20 items-center' : 'w-64'}`}>
            <div className={`flex items-center space-x-2 mb-10 px-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <Cloud size={40} className="text-blue-600 flex-shrink-0" />
                {!isSidebarCollapsed && <h1 className="text-xl font-bold text-gray-900">Cloud Cost System</h1>}
            </div>

            <div className="flex flex-col space-y-2">
                <NavLink to="/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <LayoutDashboard size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Dashboard</span>}
                </NavLink>
                <NavLink to="/projects" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <FolderOpen size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Projects</span>}
                </NavLink>
                <NavLink to="/billing" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <BarChart3 size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Billing</span>}
                </NavLink>
                
                <div>
                    <button onClick={() => setIsPricingMenuOpen(!isPricingMenuOpen)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center space-x-3"><Tag size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Project Pricing</span>}</div>
                        {!isSidebarCollapsed && <ChevronDown size={20} className={`transform transition-transform duration-200 ${isPricingMenuOpen ? 'rotate-180' : ''}`} />}
                    </button>
                    {isPricingMenuOpen && !isSidebarCollapsed && (
                        <div className="pt-2 pl-6 space-y-1">
                            <button onClick={() => handlePricingNavigation('basic')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Basic</button>
                            <button onClick={() => handlePricingNavigation('standard')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Standard</button>
                            <button onClick={() => handlePricingNavigation('premium')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Premium</button>
                        </div>
                    )}
                </div>

                {(userRole === 'admin' || userRole === 'superadmin') && (
                    <NavLink to="/settings" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                        <Settings size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Settings</span>}
                    </NavLink>
                )}
            </div>

            <div className="mt-auto flex flex-col space-y-2">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`${navLinkClasses} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    {isSidebarCollapsed ? <ChevronsRight size={20} className="flex-shrink-0" /> : <><ChevronsLeft size={20} className="flex-shrink-0" /><span>Collapse Menu</span></>}
                </button>
                <button onClick={logout} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-red-100 hover:text-red-600 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <LogOut size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </nav>
    );
};

const GlobalFilters = () => {
    const { envFilter, setEnvFilter } = useContext(GlobalStateContext);
    return (
        <header className="flex items-center bg-white p-4 rounded-xl shadow-md mb-6 no-print">
            <div className="flex items-center space-x-2"><Filter size={20} className="text-gray-600" /><h2 className="text-lg font-semibold text-gray-800">Global Filters</h2></div>
            <div className="flex items-center space-x-4 ml-auto">
                <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="p-2 border border-gray-300 rounded-full focus:outline-none text-sm">
                    <option value="all">All Environments</option>
                    <option value="prod">Production</option>
                    <option value="nonprod">Non-Production</option>
                </select>
            </div>
        </header>
    );
};

// This component contains the main application layout
const AppContent = () => {
    return (
        <div className="flex min-h-screen bg-slate-100 font-sans">
            <Sidebar />
            <div className="flex-1 p-4 sm:p-8 overflow-y-auto relative z-0">
                <Routes>
                    <Route path="/dashboard" element={<DashboardView />} />
                    <Route path="/projects" element={<><GlobalFilters /><ProjectsView /></>} />
                    <Route path="/billing" element={<><GlobalFilters /><BillingView /></>} />
                    <Route path="/pricing/:tier" element={<PricingView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/" element={<DashboardView />} />
                </Routes>
            </div>
        </div>
    );
};

// This component acts as the main router, deciding to show Login or the App
const AppRouter = () => {
    const { isLoggedIn, isAuthLoading, login, authError } = useContext(GlobalStateContext);

    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-screen font-semibold text-gray-500">Authenticating...</div>;
    }

    if (!isLoggedIn) {
        return <LoginPage onLogin={login} error={authError} />;
    }

    return <AppContent />;
};

const App = () => {
  return (
    <GlobalStateProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </GlobalStateProvider>
  );
};

export default App;

