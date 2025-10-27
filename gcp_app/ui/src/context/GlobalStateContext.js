import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';

export const GlobalStateContext = createContext();

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

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
        const response = await fetch(`/api/billing/services?platform=${platform}&year=${year}`, { headers: { 'x-access-token': token } });
        
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
                        project_id: item.project_id,
                        project_name: projectName,
                        platform: item.platform,
                        billing_year: item.billing_year,
                        service_breakdown: [],
                        total_cost: 0
                    };
                    months.forEach(m => { projects[projectName][`${m}_cost`] = 0; });
                }
                const cost = parseFloat(item.cost || 0);
                projects[projectName].service_breakdown.push(item);
                const itemMonth = item.billing_month;
                if (itemMonth && months.includes(itemMonth)) {
                    projects[projectName][`${itemMonth}_cost`] += cost;
                }
                projects[projectName].total_cost += cost;
            });
            return Object.values(projects);
        };
        
        const currentYearData = aggregateDataForYear(year, rawData);
        const previousYearData = aggregateDataForYear(year - 1, rawData);
        
        const metaResponse = await fetch(`/api/projects/meta/all?platform=${platform}`, { headers: { 'x-access-token': token } });
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
  const [userPlatforms, setUserPlatforms] = useState([]);

  const [selectedPlatform, setSelectedPlatform] = useState(() => sessionStorage.getItem('selectedPlatform') || null);
  const [envFilter, setEnvFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dataVersion, setDataVersion] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [dashboardProjectFilter, setDashboardProjectFilter] = useState('all');
  
  // 🔹 UPDATED: Renamed timer ref for clarity
  const tokenExpiryTimerRef = useRef(null);
  // 🔹 ADDED: New timer ref for user inactivity
  const idleTimerRef = useRef(null);

  const { yearlyBillingData, previousYearBillingData, isBillingLoading } = useYearlyBillingData(selectedPlatform, selectedYear, token, dataVersion);
  
  // 🔹 ADDED: This function resets the inactivity timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
    }
    
    // Set a new 30-minute timer. 30 * 60 * 1000 = 1,800,000 milliseconds
    idleTimerRef.current = setTimeout(() => {
        console.log("User inactive for 30 minutes, logging out.");
        logout();
    }, 1800000);
  }, []); // We will add 'logout' as a dependency later

  const logout = useCallback(() => {
    if (tokenExpiryTimerRef.current) {
        clearTimeout(tokenExpiryTimerRef.current);
    }
    // 🔹 ADDED: Clear the idle timer on logout
    if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
    }
    
    // 🔹 ADDED: Remove event listeners on logout
    window.removeEventListener('mousemove', resetIdleTimer);
    window.removeEventListener('mousedown', resetIdleTimer);
    window.removeEventListener('keypress', resetIdleTimer);
    window.removeEventListener('touchstart', resetIdleTimer);

    setToken(null);
    setUserRole(null); 
    setIsLoggedIn(false); 
    setSelectedPlatform(null);
    setUserPlatforms([]);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("selectedPlatform");
  }, [resetIdleTimer]); // Add resetIdleTimer to dependency array
  
  const setAuthSession = useCallback((data, rememberMe) => {
    const decodedToken = parseJwt(data.token);
    if (!decodedToken || !decodedToken.exp) {
        console.error("Invalid token received.");
        return;
    }

    const expiresIn = (decodedToken.exp * 1000) - Date.now();
    
    if (expiresIn <= 0) {
        logout();
        return;
    }

    setToken(data.token);
    setUserRole(data.role);
    setUserPlatforms(data.accessible_platforms || []);
    setIsLoggedIn(true);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("authToken", data.token);
    storage.setItem("userRole", data.role);

    // This timer logs out when the token itself expires
    tokenExpiryTimerRef.current = setTimeout(logout, expiresIn);
    
    // 🔹 ADDED: Start the inactivity timer
    resetIdleTimer();
  }, [logout, resetIdleTimer]);
  
  // 🔹 ADDED: This effect runs when the user logs in or out
  useEffect(() => {
    if (isLoggedIn) {
        // If logged in, start listening for activity
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('mousedown', resetIdleTimer);
        window.addEventListener('keypress', resetIdleTimer);
        window.addEventListener('touchstart', resetIdleTimer);
        // Start the first timer
        resetIdleTimer();
    }
    
    // Cleanup function: removes listeners when component unmounts or user logs out
    return () => {
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('mousedown', resetIdleTimer);
        window.removeEventListener('keypress', resetIdleTimer);
        window.removeEventListener('touchstart', resetIdleTimer);
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
    };
  }, [isLoggedIn, resetIdleTimer]);

  useEffect(() => {
    if (selectedPlatform) {
        sessionStorage.setItem('selectedPlatform', selectedPlatform);
    } else {
        sessionStorage.removeItem('selectedPlatform');
    }
  }, [selectedPlatform]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
        if (e.matches) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };
    if (theme === 'system') {
        localStorage.removeItem('theme');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        handleSystemThemeChange(mediaQuery);
    } else {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
    return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const triggerRefetch = () => setDataVersion(v => v + 1);
  
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const savedRole = localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
    
    if (savedToken && savedRole) {
      const decodedToken = parseJwt(savedToken);
      if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
        const isRemembered = !!localStorage.getItem("authToken");
        setAuthSession({ token: savedToken, role: savedRole, accessible_platforms: [] }, isRemembered);
      } else {
        logout();
      }
    }
    setIsAuthLoading(false);
  }, [logout, setAuthSession]);

  const login = async (username, password, rememberMe) => {
    setAuthError('');
    try {
      const response = await fetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        setAuthSession(data, rememberMe);
      } else {
        const result = await response.json();
        setAuthError(result.error || 'Invalid username or password.');
      }
    } catch (err) {
      setAuthError('Login failed. Please ensure the backend is running.');
    }
  };

  const value = {
    token, userRole, isLoggedIn, isAuthLoading, authError, login, logout, userPlatforms,
    selectedPlatform, setSelectedPlatform, envFilter, setEnvFilter, selectedYear, setSelectedYear,
    yearlyBillingData, previousYearBillingData, isBillingLoading, triggerRefetch,
    isSidebarCollapsed, setIsSidebarCollapsed, theme, setTheme, dashboardProjectFilter, setDashboardProjectFilter,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};