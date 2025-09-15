import React, { useState, useContext, useRef, useEffect } from 'react'; // Added useRef and useEffect
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { Cloud, LayoutDashboard, FolderOpen, BarChart3, LogOut, Settings, Filter, Tag, ChevronDown, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react';
import { GlobalStateProvider, GlobalStateContext } from './context/GlobalStateContext';

// Component Imports
import LoginPage from './components/LoginPage';
import DashboardView from './components/DashboardView';
import ProjectsView from './components/ProjectsView';
import BillingView from './components/BillingView';
import SettingsView from './components/SettingsView';
import PricingView from './components/PricingView';
import BudgetsView from './components/BudgetsView';

const pagePermissions = {
    '/dashboard': ['user', 'admin', 'superadmin'],
    '/projects': ['user', 'admin', 'superadmin'],
    '/budgets': ['user', 'admin', 'superadmin'],
    '/billing': ['user', 'admin', 'superadmin'],
    '/pricing': ['user', 'admin', 'superadmin'],
    '/settings': ['admin', 'superadmin'],
};

const Sidebar = () => {
    const { isSidebarCollapsed, setIsSidebarCollapsed, userRole, logout } = useContext(GlobalStateContext);
    const [isPricingMenuOpen, setIsPricingMenuOpen] = useState(false);
    const navigate = useNavigate();
    
    // --- UPDATED: Refs for positioning and click-away detection ---
    const pricingDropdownRef = useRef(null); // Ref for the main button area (including expanded dropdown)
    const pricingPopupRef = useRef(null); // Ref for the collapsed pop-up menu
    const tagIconRef = useRef(null); // Ref for the Tag icon to get its position

    const [popupCoords, setPopupCoords] = useState({ top: 0, left: 0 }); // State to store pop-up coordinates

    const handlePricingNavigation = (tier) => {
        navigate(`/pricing/${tier}`);
        setIsPricingMenuOpen(false); // Close menu on selection
    };
    
    // --- UPDATED: Hook to close the menu if user clicks outside of it ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click occurred outside the main dropdown container (button + expanded menu)
            // AND outside the floating pop-up menu (if it's rendered)
            if (
                pricingDropdownRef.current && 
                !pricingDropdownRef.current.contains(event.target) &&
                (
                    !pricingPopupRef.current || // If popup isn't rendered, this is true
                    !pricingPopupRef.current.contains(event.target) // If popup is rendered, check if click is outside it
                )
            ) {
                setIsPricingMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // --- NEW: Effect to calculate pop-up position when collapsed menu is open ---
    useEffect(() => {
        if (isSidebarCollapsed && isPricingMenuOpen && tagIconRef.current) {
            const rect = tagIconRef.current.getBoundingClientRect();
            // Position the popup slightly to the right of the icon, vertically centered with the icon
            setPopupCoords({
                // Adjust top: align with icon's top, or slightly above/below for centering
                top: rect.top, 
                // Position to the right of the icon, with a small gap
                left: rect.right + 10 
            });
        }
    }, [isSidebarCollapsed, isPricingMenuOpen, tagIconRef.current]); // Recalculate if these dependencies change


    const canView = (path) => {
        return pagePermissions[path]?.includes(userRole);
    };

    const navLinkClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100";
    const activeLinkClasses = "bg-blue-500 text-white";

    return (
        <nav className={`main-sidebar bg-white p-4 shadow-lg flex flex-col sticky top-0 h-screen transition-all duration-300 z-20 ${isSidebarCollapsed ? 'w-20 items-center' : 'w-64'}`}> {/* Added z-20 to sidebar */}
            <div className={`flex items-center space-x-2 mb-10 px-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <Cloud size={40} className="text-blue-600 flex-shrink-0" />
                {!isSidebarCollapsed && <h1 className="text-xl font-bold text-gray-900">Cloud Cost System</h1>}
            </div>

            <div className="flex flex-col space-y-2">
                {canView('/dashboard') && <NavLink to="/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <LayoutDashboard size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Dashboard</span>}
                </NavLink>}
                {canView('/projects') && <NavLink to="/projects" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <FolderOpen size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Projects</span>}
                </NavLink>}
                 {canView('/budgets') && <NavLink to="/budgets" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <FileText size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Budgets</span>}
                </NavLink>}
                {canView('/billing') && <NavLink to="/billing" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <BarChart3 size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Billing</span>}
                </NavLink>}
                
                {/* --- UPDATED PRICING SECTION --- */}
                {canView('/pricing') && 
                    <div ref={pricingDropdownRef} className="relative"> {/* Use pricingDropdownRef here */}
                        <button onClick={() => setIsPricingMenuOpen(prev => !prev)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                            <div className="flex items-center space-x-3">
                                <Tag ref={tagIconRef} size={20} className="flex-shrink-0" /> {/* Added ref to Tag icon */}
                                {!isSidebarCollapsed && <span>Project Pricing</span>}
                            </div>
                            {!isSidebarCollapsed && <ChevronDown size={20} className={`transform transition-transform duration-200 ${isPricingMenuOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        
                        {/* Dropdown for expanded sidebar */}
                        {isPricingMenuOpen && !isSidebarCollapsed && (
                            <div className="pt-2 pl-6 space-y-1">
                                <button onClick={() => handlePricingNavigation('basic')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Basic</button>
                                <button onClick={() => handlePricingNavigation('standard')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Standard</button>
                                <button onClick={() => handlePricingNavigation('premium')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Premium</button>
                            </div>
                        )}

                        {/* --- NEW: Pop-up menu for collapsed sidebar with fixed positioning --- */}
                        {isPricingMenuOpen && isSidebarCollapsed && (
                            <div
                                ref={pricingPopupRef} // Added ref to the popup itself
                                style={{ top: popupCoords.top, left: popupCoords.left }}
                                className="fixed p-2 bg-white rounded-lg shadow-xl border w-44 z-50" // `fixed` position and high `z-index`
                            >
                                <h4 className="px-2 pt-1 pb-2 text-sm font-semibold text-gray-500 border-b mb-1">Select Tier</h4>
                                <div className="flex flex-col space-y-1">
                                    <button onClick={() => handlePricingNavigation('basic')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Basic</button>
                                    <button onClick={() => handlePricingNavigation('standard')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Standard</button>
                                    <button onClick={() => handlePricingNavigation('premium')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 text-gray-600">GCP Premium</button>
                                </div>
                            </div>
                        )}
                    </div>
                }

                {canView('/settings') && <NavLink to="/settings" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                    <Settings size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Settings</span>}
                </NavLink>}
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

const ProtectedRoute = ({ path, element }) => {
    const { userRole } = useContext(GlobalStateContext);
    const canView = pagePermissions[path]?.includes(userRole);
    return canView ? element : <Navigate to="/dashboard" replace />;
};

const AppContent = () => {
    return (
        <>
            <style> {` @media print { body { -webkit-print-color-adjust: exact; } .no-print, .main-sidebar { display: none !important; } .main-content-area { overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; width: 100% !important; } .printable-content { box-shadow: none !important; border: none !important; } @page { size: A4 portrait; margin: 0.75in; } } `} </style>
            <div className="flex min-h-screen bg-slate-100 font-sans">
                <Sidebar />
                <div className="main-content-area flex-1 p-4 sm:p-8 overflow-y-auto relative z-0">
                    <Routes>
                        <Route path="/dashboard" element={<ProtectedRoute path="/dashboard" element={<DashboardView />} />} />
                        <Route path="/projects" element={<ProtectedRoute path="/projects" element={<><GlobalFilters /><ProjectsView /></>} />} />
                        <Route path="/billing" element={<ProtectedRoute path="/billing" element={<><GlobalFilters /><BillingView /></>} />} />
                        <Route path="/budgets" element={<ProtectedRoute path="/budgets" element={<BudgetsView />} />} />
                        <Route path="/pricing/:tier" element={<ProtectedRoute path="/pricing" element={<PricingView />} />} />
                        <Route path="/settings" element={<ProtectedRoute path="/settings" element={<SettingsView />} />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </div>
        </>
    );
};

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