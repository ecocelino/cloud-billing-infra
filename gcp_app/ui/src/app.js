import React, { useState, useContext, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Cloud, LayoutDashboard, FolderOpen, BarChart3, LogOut, Settings, Filter, Tag, ChevronDown, ChevronsLeft, ChevronsRight, FileText, Users, FileCog, Palette, User as ProfileIcon, ScrollText, GitBranchPlus } from 'lucide-react';
import { GlobalStateProvider, GlobalStateContext } from './context/GlobalStateContext';

// --- Component & Page Imports ---
import LoginPage from './components/LoginPage';
import ForgotPasswordView from './components/ForgotPasswordView';
import SelectPlatform from './components/SelectPlatform';
import ProfileView from './components/ProfileView';
import ProjectDetailPage from './pages/ProjectDetailPage';

// Page Wrappers from the 'pages' directory
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import BillingPage from './pages/BillingPage';
import BudgetsPage from './pages/BudgetsPage';
import ReportsPage from './pages/ReportsPage';
import PricingPage from './pages/PricingPage';

// Global Settings components
import { UsersView, CustomizeView } from './components/SettingsView';
import GcpBusinessRulesView from './components/gcp/GcpBusinessRulesView';


const pagePermissions = {
    '/dashboard': ['user', 'admin', 'superadmin'],
    '/projects': ['user', 'admin', 'superadmin'],
    '/budgets': ['user', 'admin', 'superadmin'],
    '/billing': ['user', 'admin', 'superadmin'],
    '/reports': ['user', 'admin', 'superadmin'],
    '/pricing': ['user', 'admin', 'superadmin'],
    '/settings/users': ['admin', 'superadmin'],
    '/settings/business-rules': ['admin', 'superadmin'],
    '/settings/customize-view': ['admin', 'superadmin'],
    '/profile': ['user', 'admin', 'superadmin'],
};

const Sidebar = () => {
    const { isSidebarCollapsed, setIsSidebarCollapsed, userRole, logout, selectedPlatform, setSelectedPlatform } = useContext(GlobalStateContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [isPricingMenuOpen, setIsPricingMenuOpen] = useState(false);
    const pricingDropdownRef = useRef(null);
    const pricingPopupRef = useRef(null);
    const pricingIconRef = useRef(null);
    const [pricingPopupCoords, setPricingPopupCoords] = useState({ top: 0, left: 0 });

    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const settingsDropdownRef = useRef(null);
    const settingsPopupRef = useRef(null);
    const settingsIconRef = useRef(null);
    const [settingsPopupCoords, setSettingsPopupCoords] = useState({ top: 0, left: 0 });

    const handlePricingNavigation = (tier) => {
        navigate(`/pricing/${tier}`);
        setIsPricingMenuOpen(false);
    };

    const handleSettingsNavigation = (path) => {
        navigate(path);
        setIsSettingsMenuOpen(false);
    };

    const handleChangePlatform = () => {
        setSelectedPlatform(null);
        navigate('/select-platform');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pricingDropdownRef.current && !pricingDropdownRef.current.contains(event.target) && (!pricingPopupRef.current || !pricingPopupRef.current.contains(event.target))) {
                setIsPricingMenuOpen(false);
            }
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target) && (!settingsPopupRef.current || !settingsPopupRef.current.contains(event.target))) {
                setIsSettingsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isSidebarCollapsed) {
            if (isPricingMenuOpen && pricingIconRef.current) {
                const rect = pricingIconRef.current.getBoundingClientRect();
                setPricingPopupCoords({ top: rect.top, left: rect.right + 10 });
            }
            if (isSettingsMenuOpen && settingsIconRef.current) {
                const rect = settingsIconRef.current.getBoundingClientRect();
                setSettingsPopupCoords({ top: rect.top, left: rect.right + 10 });
            }
        }
    }, [isSidebarCollapsed, isPricingMenuOpen, isSettingsMenuOpen]);

    const canView = (path) => {
        if (path.endsWith('/*')) {
            const parentPath = path.replace('/*', '');
            return Object.keys(pagePermissions).some(p => p.startsWith(parentPath) && pagePermissions[p]?.includes(userRole));
        }
        return pagePermissions[path]?.includes(userRole);
    };

    const navLinkClasses = "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";
    const activeLinkClasses = "bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-600";

    const gcpLinks = [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: '/dashboard' },
        { path: "/projects", label: "Projects", icon: FolderOpen, permission: '/projects' },
        { path: "/budgets", label: "Budgets", icon: FileText, permission: '/budgets' },
        { path: "/billing", label: "Billing", icon: BarChart3, permission: '/billing' },
        { path: "/reports", label: "Reports", icon: ScrollText, permission: '/reports' },
    ];

    const awsLinks = [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: '/dashboard' },
    ];
    
    const platformLinks = selectedPlatform === 'GCP' ? gcpLinks : awsLinks;

    return (
        <nav className={`main-sidebar bg-white dark:bg-gray-800 p-4 shadow-lg flex flex-col sticky top-0 h-screen transition-all duration-300 z-20 ${isSidebarCollapsed ? 'w-20 items-center' : 'w-64'}`}>
            <div className={`flex items-center space-x-2 mb-4 px-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                {selectedPlatform === 'AWS' ? (
                    <img src="/images/aws-logo.png" alt="AWS Logo" className="w-10 h-10 flex-shrink-0 dark:invert" />
                ) : (
                    <img src="/images/gcp-logo.png" alt="GCP Logo" className="w-10 h-10 flex-shrink-0" />
                )}
                {!isSidebarCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cloud Cost System</h1>}
            </div>

            {!isSidebarCollapsed && (
                <div className="px-3 py-2 mb-4 text-center">
                    <button onClick={handleChangePlatform} className="w-full text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 rounded-lg py-2 hover:bg-blue-200 dark:hover:bg-blue-900 flex items-center justify-center gap-2">
                        <GitBranchPlus size={16}/> Change Platform ({selectedPlatform})
                    </button>
                </div>
            )}

            <div className="flex flex-col space-y-2">
                {platformLinks.map(link => (
                    canView(link.permission) && (
                        <NavLink key={link.path} to={link.path} className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`}>
                            <link.icon size={20} className="flex-shrink-0" />
                            {!isSidebarCollapsed && <span>{link.label}</span>}
                        </NavLink>
                    )
                ))}
                
                {canView('/pricing') && selectedPlatform === 'GCP' &&
                    <div ref={pricingDropdownRef} className="relative">
                        <button onClick={() => setIsPricingMenuOpen(prev => !prev)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                            <div className="flex items-center space-x-3">
                                <Tag ref={pricingIconRef} size={20} className="flex-shrink-0" />
                                {!isSidebarCollapsed && <span>Project Pricing</span>}
                            </div>
                            {!isSidebarCollapsed && <ChevronDown size={20} className={`transform transition-transform duration-200 ${isPricingMenuOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        {isPricingMenuOpen && !isSidebarCollapsed && (
                            <div className="pt-2 pl-6 space-y-1">
                                <button onClick={() => handlePricingNavigation('basic')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Basic</button>
                                <button onClick={() => handlePricingNavigation('standard')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Standard</button>
                                <button onClick={() => handlePricingNavigation('premium')} className="w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Premium</button>
                            </div>
                        )}
                        {isPricingMenuOpen && isSidebarCollapsed && (
                            <div ref={pricingPopupRef} style={{ top: pricingPopupCoords.top, left: pricingPopupCoords.left }} className="fixed p-2 bg-white dark:bg-gray-800 dark:border-gray-600 rounded-lg shadow-xl border w-44 z-50">
                                <h4 className="px-2 pt-1 pb-2 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-600 mb-1">Select Tier</h4>
                                <div className="flex flex-col space-y-1">
                                    <button onClick={() => handlePricingNavigation('basic')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Basic</button>
                                    <button onClick={() => handlePricingNavigation('standard')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Standard</button>
                                    <button onClick={() => handlePricingNavigation('premium')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">GCP Premium</button>
                                </div>
                            </div>
                        )}
                    </div>
                }

                {canView('/settings/*') && 
                    <div ref={settingsDropdownRef} className="relative">
                        <button onClick={() => setIsSettingsMenuOpen(prev => !prev)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname.startsWith('/settings') ? 'bg-gray-100 dark:bg-gray-700' : ''} ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                             <div className="flex items-center space-x-3">
                                <Settings ref={settingsIconRef} size={20} className="flex-shrink-0" />
                                {!isSidebarCollapsed && <span>Settings</span>}
                            </div>
                            {!isSidebarCollapsed && <ChevronDown size={20} className={`transform transition-transform duration-200 ${isSettingsMenuOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        {isSettingsMenuOpen && !isSidebarCollapsed && (
                             <div className="pt-2 pl-6 space-y-1">
                                <NavLink to="/settings/users" onClick={() => setIsSettingsMenuOpen(false)} className={({ isActive }) => `flex items-center space-x-3 w-full text-left px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}><Users size={16} className="mr-2"/>Users</NavLink>
                                <NavLink to="/settings/business-rules" onClick={() => setIsSettingsMenuOpen(false)} className={({ isActive }) => `flex items-center space-x-3 w-full text-left px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}><FileCog size={16} className="mr-2"/>Business Rules</NavLink>
                                <NavLink to="/settings/customize-view" onClick={() => setIsSettingsMenuOpen(false)} className={({ isActive }) => `flex items-center space-x-3 w-full text-left px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}><Palette size={16} className="mr-2"/>Customize View</NavLink>
                            </div>
                        )}
                        {isSettingsMenuOpen && isSidebarCollapsed && (
                            <div ref={settingsPopupRef} style={{ top: settingsPopupCoords.top, left: settingsPopupCoords.left }} className="fixed p-2 bg-white dark:bg-gray-800 dark:border-gray-600 rounded-lg shadow-xl border w-48 z-50">
                                <h4 className="px-2 pt-1 pb-2 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b dark:border-gray-600 mb-1">Settings</h4>
                                <div className="flex flex-col space-y-1">
                                    <button onClick={() => handleSettingsNavigation('/settings/users')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Users</button>
                                    <button onClick={() => handleSettingsNavigation('/settings/business-rules')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Business Rules</button>
                                    <button onClick={() => handleSettingsNavigation('/settings/customize-view')} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Customize View</button>
                                </div>
                            </div>
                        )}
                    </div>
                }
            </div>

            <div className="mt-auto flex flex-col space-y-2">
                <NavLink to="/profile" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeLinkClasses : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <ProfileIcon size={20} className="flex-shrink-0" />
                    {!isSidebarCollapsed && <span>My Profile</span>}
                </NavLink>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`${navLinkClasses} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    {isSidebarCollapsed ? <ChevronsRight size={20} className="flex-shrink-0" /> : <><ChevronsLeft size={20} className="flex-shrink-0" /><span>Collapse Menu</span></>}
                </button>
                <button onClick={logout} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <LogOut size={20} className="flex-shrink-0" />{!isSidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </nav>
    );
};

const GlobalFilters = () => {
    const { envFilter, setEnvFilter } = useContext(GlobalStateContext);
    return (
        <header className="flex items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6 no-print">
            <div className="flex items-center space-x-2"><Filter size={20} className="text-gray-600 dark:text-gray-300" /><h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Global Filters</h2></div>
            <div className="flex items-center space-x-4 ml-auto">
                <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
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
    const { selectedPlatform } = useContext(GlobalStateContext);

    const BusinessRulesPageWrapper = () => {
        switch(selectedPlatform) {
            case 'GCP':
                return <GcpBusinessRulesView />;
            case 'AWS':
                return <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg"><h2 className="text-2xl font-bold">AWS Business Rules</h2><p className="text-gray-500 mt-2">Coming soon...</p></div>;
            default:
                return <div>Invalid Platform</div>;
        }
    };

    return (
        <>
            <style> {` @media print { body { -webkit-print-color-adjust: exact; } .no-print, .main-sidebar { display: none !important; } .main-content-area { overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; width: 100% !important; } .printable-content { box-shadow: none !important; border: none !important; } @page { size: A4 portrait; margin: 0.75in; } } `} </style>
            <div className="flex min-h-screen bg-slate-100 dark:bg-gray-900 font-sans">
                <Sidebar />
                <div className="main-content-area flex-1 p-4 sm:p-8 overflow-y-auto relative z-0">
                    <Routes>
                        <Route path="/dashboard" element={<ProtectedRoute path="/dashboard" element={<DashboardPage />} />} />
                        <Route path="/projects" element={<ProtectedRoute path="/projects" element={<><GlobalFilters /><ProjectsPage /></>} />} />
                        <Route path="/project/:projectId" element={<ProtectedRoute path="/projects" element={<ProjectDetailPage />} />} />
                        <Route path="/billing" element={<ProtectedRoute path="/billing" element={<><GlobalFilters /><BillingPage /></>} />} />
                        <Route path="/budgets" element={<ProtectedRoute path="/budgets" element={<BudgetsPage />} />} />
                        <Route path="/reports" element={<ProtectedRoute path="/reports" element={<ReportsPage />} />} />
                        <Route path="/pricing/:tier" element={<ProtectedRoute path="/pricing" element={<PricingPage />} />} />
                        <Route path="/settings/users" element={<ProtectedRoute path="/settings/users" element={<UsersView />} />} />
                        <Route path="/settings/business-rules" element={<ProtectedRoute path="/settings/business-rules" element={<BusinessRulesPageWrapper />} />} />
                        <Route path="/settings/customize-view" element={<ProtectedRoute path="/settings/customize-view" element={<CustomizeView />} />} />
                        <Route path="/profile" element={<ProtectedRoute path="/profile" element={<ProfileView />} />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </div>
        </>
    );
};

const AppRouter = () => {
    const { isLoggedIn, isAuthLoading, login, authError, selectedPlatform, userPlatforms, setSelectedPlatform } = useContext(GlobalStateContext);

    useEffect(() => {
        if (isLoggedIn && userPlatforms.length === 1 && !selectedPlatform) {
            setSelectedPlatform(userPlatforms[0]);
        }
    }, [isLoggedIn, userPlatforms, selectedPlatform, setSelectedPlatform]);

    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-screen font-semibold text-gray-500 dark:bg-gray-900 dark:text-gray-400">Authenticating...</div>;
    }

    return (
        <Routes>
            <Route 
                path="/login" 
                element={isLoggedIn ? <Navigate to="/select-platform" replace /> : <LoginPage onLogin={login} error={authError} />} 
            />
            <Route 
                path="/forgot-password" 
                element={isLoggedIn ? <Navigate to="/select-platform" replace /> : <ForgotPasswordView />} 
            />
            <Route 
                path="/select-platform" 
                element={!isLoggedIn ? <Navigate to="/login" replace /> : <SelectPlatform />} 
            />
            <Route 
                path="/*" 
                element={
                    !isLoggedIn 
                        ? <Navigate to="/login" replace /> 
                        : !selectedPlatform 
                            ? <Navigate to="/select-platform" replace /> 
                            : <AppContent />
                } 
            />
        </Routes>
    );
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