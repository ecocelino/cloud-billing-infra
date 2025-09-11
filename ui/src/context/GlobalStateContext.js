import React, { createContext, useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const GlobalStateContext = createContext();

const useYearlyBillingData = (platform, year, token, dataVersion) => {
  // --- FIX: This state now holds data for both years ---
  const [processedData, setProcessedData] = useState({ current: [], previous: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      if (!platform || !year || !token) {
        setProcessedData({ current: [], previous: [] });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // The API now fetches both current and previous year data in one call
        const response = await fetch(`${API_BASE_URL}/billing/services?platform=${platform}&year=${year}`, { headers: { 'x-access-token': token } });
        
        if (!response.ok) {
            throw new Error('Failed to fetch initial data.');
        }

        const rawData = await response.json();
        
        if (!Array.isArray(rawData)) {
            setProcessedData({ current: [], previous: [] });
            return;
        }

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        // Helper function to aggregate data for a specific year
        const aggregateDataForYear = (targetYear, data) => {
            const projects = {};
            const yearData = data.filter(d => d.billing_year === targetYear);

            yearData.forEach(item => {
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
            return Object.values(projects);
        };
        
        // Process data for both the current and previous year
        const currentYearData = aggregateDataForYear(year, rawData);
        const previousYearData = aggregateDataForYear(year - 1, rawData);

        setProcessedData({ current: currentYearData, previous: previousYearData });

      } catch (error) {
        console.error("Failed to process billing data:", error);
        setProcessedData({ current: [], previous: [] });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataAndProcess();
  }, [platform, year, token, dataVersion]);

  // Return the structured data
  return { 
      yearlyBillingData: processedData.current, 
      previousYearBillingData: processedData.previous,
      isBillingLoading: isLoading 
  };
};


export const GlobalStateProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [platformFilter, setPlatformFilter] = useState('GCP');
  const [envFilter, setEnvFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dataVersion, setDataVersion] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const triggerRefetch = () => setDataVersion(v => v + 1);

  // --- FIX: The hook now provides both years' data ---
  const { yearlyBillingData, previousYearBillingData, isBillingLoading } = useYearlyBillingData(platformFilter, selectedYear, token, dataVersion);
  
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedRole = localStorage.getItem("userRole");
    if (savedToken && savedRole) {
      setToken(savedToken);
      setUserRole(savedRole);
      setIsLoggedIn(true);
    }
    setIsAuthLoading(false);
  }, []);

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
    token,
    userRole,
    isLoggedIn,
    isAuthLoading,
    authError,
    login,
    logout,
    platformFilter, setPlatformFilter,
    envFilter, setEnvFilter,
    selectedYear, setSelectedYear,
    yearlyBillingData,
    previousYearBillingData, // <-- Pass previous year data
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
