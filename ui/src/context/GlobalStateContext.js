import React, { createContext, useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const GlobalStateContext = createContext();

const useYearlyBillingData = (platform, year, token, dataVersion) => {
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      // Don't fetch if there's no token
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

        if (!billingResponse.ok || !metaResponse.ok) {
            throw new Error('Failed to fetch initial data.');
        }

        const rawData = await billingResponse.json();
        const metaData = await metaResponse.json();
        
        if (!Array.isArray(rawData)) {
            setProcessedData([]);
            return;
        }

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        
        const projects = {};
        rawData.forEach(item => {
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


export const GlobalStateProvider = ({ children }) => {
  // --- AUTHENTICATION STATE NOW LIVES HERE ---
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Prevents rendering until auth is checked

  // --- App State ---
  const [platformFilter, setPlatformFilter] = useState('GCP');
  const [envFilter, setEnvFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dataVersion, setDataVersion] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const triggerRefetch = () => setDataVersion(v => v + 1);

  const { yearlyBillingData, isBillingLoading } = useYearlyBillingData(platformFilter, selectedYear, token, dataVersion);
  
  // Check for saved token on initial app load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedRole = localStorage.getItem("userRole");
    if (savedToken && savedRole) {
      setToken(savedToken);
      setUserRole(savedRole);
      setIsLoggedIn(true);
    }
    setIsAuthLoading(false); // Auth check is complete
  }, []);

  // --- AUTH FUNCTIONS NOW LIVE HERE ---
  const login = async (username, password) => {
    setAuthError('');
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
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userRole", data.role);
      } else {
        const result = await response.json();
        setAuthError(result.error || 'Invalid username or password.');
      }
    } catch (err) {
      setAuthError('Login failed. Please ensure the backend is running.');
    }
  };
  
  const logout = () => {
    setToken(null);
    setUserRole(null); 
    setIsLoggedIn(false); 
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
  };

  const value = {
    // Auth state and functions
    token,
    userRole,
    isLoggedIn,
    isAuthLoading,
    authError,
    login,
    logout,
    
    // App state and functions
    platformFilter, setPlatformFilter,
    envFilter, setEnvFilter,
    selectedYear, setSelectedYear,
    yearlyBillingData,
    isBillingLoading,
    triggerRefetch,
    isSidebarCollapsed, 
    setIsSidebarCollapsed
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};