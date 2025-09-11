import React, { createContext, useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const GlobalStateContext = createContext();

const useYearlyBillingData = (platform, year, token, dataVersion) => {
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

        const aggregateDataForYear = (targetYear, data) => {
            const projects = {};
            const yearData = data.filter(d => d.billing_year === targetYear);

            yearData.forEach(item => {
                const projectName = item.project_name;
                if (!projects[projectName]) {
                    projects[projectName] = { 
                        // --- FIX: Ensure project_id is preserved during aggregation ---
                        project_id: item.project_id,
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
        
        const currentYearData = aggregateDataForYear(year, rawData);
        const previousYearData = aggregateDataForYear(year - 1, rawData);
        
        // --- Add project codes to the final data ---
        const metaResponse = await fetch(`${API_BASE_URL}/projects/meta/all`, { headers: { 'x-access-token': token } });
        if(metaResponse.ok) {
            const metaData = await metaResponse.json();
            currentYearData.forEach(project => {
                if (metaData[project.project_name]) {
                    project.project_code = metaData[project.project_name].projectCode;
                }
            });
             previousYearData.forEach(project => {
                if (metaData[project.project_name]) {
                    project.project_code = metaData[project.project_name].projectCode;
                }
            });
        }

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
    previousYearBillingData,
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

