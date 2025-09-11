import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { Bar, Pie, getElementAtEvent } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { DollarSign, ChevronDown, TrendingUp, TrendingDown, Target, PieChart, BarChartHorizontal, ChevronRight, RefreshCw, BarChart } from 'lucide-react';
import { formatCurrency } from '../utils.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];
const colorPalette = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#64748b', '#f59e0b'];
const previousYearColor = '#9ca3af'; // Gray for the previous year's bars

const ServiceBreakdownView = ({ services, selectedMonth }) => {
    const [expandedServices, setExpandedServices] = useState({});

    const toggleService = (serviceName) => {
        setExpandedServices(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
    };

    const aggregatedServices = useMemo(() => {
        const serviceMap = new Map();
        const dataForMonth = services.filter(s => selectedMonth === 'all' || s.billing_month === selectedMonth);
        
        dataForMonth.forEach(item => {
                const serviceName = item.service_description || item.type || 'Uncategorized Services';
                if (!serviceMap.has(serviceName)) {
                    serviceMap.set(serviceName, { totalCost: 0, skus: [] });
                }
                const serviceGroup = serviceMap.get(serviceName);
                const cost = parseFloat(item.cost || 0);
                serviceGroup.totalCost += cost;
                serviceGroup.skus.push({ ...item, cost });
            });
        return Array.from(serviceMap.entries()).sort(([,a], [,b]) => b.totalCost - a.totalCost);
    }, [services, selectedMonth]);
    
    if (aggregatedServices.length === 0) {
        return <p className="text-gray-500 text-center mt-4">No service data to display for the current selection.</p>;
    }

    return (
        <ul className="space-y-2">
            {aggregatedServices.map(([serviceName, data]) => (
                <li key={serviceName}>
                    <div onClick={() => toggleService(serviceName)} className="flex justify-between items-center cursor-pointer p-1 rounded hover:bg-slate-200">
                        <div className="flex items-center">
                            {expandedServices[serviceName] ? <ChevronDown size={16} className="mr-1" /> : <ChevronRight size={16} className="mr-1" />}
                            <span className="font-bold text-gray-800">{serviceName}</span>
                        </div>
                        <span className="font-bold text-gray-800">{formatCurrency(data.totalCost)}</span>
                    </div>
                    {expandedServices[serviceName] && (
                        <ul className="list-disc pl-10 mt-1 space-y-1">
                            {data.skus.sort((a,b) => b.cost - a.cost).map((sku, idx) => (
                                <li key={idx} className="flex justify-between">
                                    <span className="text-gray-600 text-sm">{sku.sku_description || 'N/A'}</span>
                                    <span className="font-medium text-gray-600 text-sm">{formatCurrency(sku.cost)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
};


const DashboardView = () => {
    const { yearlyBillingData: inventory, previousYearBillingData, selectedYear, setSelectedYear } = useContext(GlobalStateContext);

    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    const [rightChartView, setRightChartView] = useState('pie');
    
    const dropdownRef = useRef(null);
    const mainBarChartRef = useRef(null);
    const rightChartRef = useRef(null);

    const projectNames = useMemo(() =>
        [...new Set(inventory.map(item => item.project_name).sort())]
    , [inventory]);
    
    const filteredProjectNames = useMemo(() => {
        if (!projectSearchTerm) return projectNames;
        return projectNames.filter(name =>
            name.toLowerCase().includes(projectSearchTerm.toLowerCase())
        );
    }, [projectNames, projectSearchTerm]);
    
    const filteredInventory = useMemo(() => {
        if (selectedProjects.length === 0) return inventory;
        return inventory.filter(item => selectedProjects.includes(item.project_name));
    }, [inventory, selectedProjects]);

    const filteredPreviousYearInventory = useMemo(() => {
        if (selectedProjects.length === 0) return previousYearBillingData;
        return previousYearBillingData.filter(item => selectedProjects.includes(item.project_name));
    }, [previousYearBillingData, selectedProjects]);
    
    const projectTitleDisplay = useMemo(() => {
        if (selectedProjects.length === 0) return 'All Projects';
        if (selectedProjects.length === 1) return selectedProjects[0];
        return `${selectedProjects.length} Projects`;
    }, [selectedProjects]);

    const calculateCostForPeriod = (item, month) => {
        if (month === 'all') {
            return months.reduce((sum, m) => sum + parseFloat(item[`${m}_cost`] || 0), 0);
        }
        return parseFloat(item[`${month}_cost`] || 0);
    };

    const totalCostForPeriod = useMemo(() => {
        return filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, selectedMonth), 0);
    }, [filteredInventory, selectedMonth]);

    const costTrendData = useMemo(() => {
        if (selectedMonth === 'all') {
            const currentYearTotal = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, 'all'), 0);
            const previousYearTotal = filteredPreviousYearInventory.reduce((total, item) => total + calculateCostForPeriod(item, 'all'), 0);
            
            if (previousYearTotal === 0) {
                const hasValue = currentYearTotal > 0;
                return { type: 'yoy', title: 'YoY Trend', percentage: hasValue ? 100 : 0, prevYearCost: previousYearTotal, isIncrease: hasValue, hasValue };
            }

            const percentage = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
            return { type: 'yoy', title: 'YoY Trend', percentage: Math.round(percentage), prevYearCost: previousYearTotal, isIncrease: percentage > 0, hasValue: true };
        }
        
        const currentMonthIndex = months.indexOf(selectedMonth);
        if (currentMonthIndex === 0) {
            return { type: 'mom', title: 'MoM Trend', percentage: 0, prevMonthCost: 0, isIncrease: false, hasValue: false };
        }
        const prevMonth = months[currentMonthIndex - 1];
        const currentMonthCost = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, selectedMonth), 0);
        const prevMonthCost = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, prevMonth), 0);

        if (prevMonthCost === 0) {
            const hasValue = currentMonthCost > 0;
            return { type: 'mom', title: 'MoM Trend', percentage: hasValue ? 100 : 0, prevMonthCost, isIncrease: hasValue, hasValue };
        }
        const percentage = ((currentMonthCost - prevMonthCost) / prevMonthCost) * 100;
        return { type: 'mom', title: 'MoM Trend', percentage: Math.round(percentage), prevMonthCost, isIncrease: percentage > 0, hasValue: true };
    }, [filteredInventory, filteredPreviousYearInventory, selectedMonth]);

    // --- FIX: Add a separate calculation for Average Monthly Spend ---
    const averageMonthlySpend = useMemo(() => {
        const totalYearlyCost = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, 'all'), 0);
        // Only count months that actually have data to avoid skewing the average
        const monthsWithData = months.filter(m => filteredInventory.some(item => (item[`${m}_cost`] || 0) > 0)).length;
        return monthsWithData > 0 ? totalYearlyCost / monthsWithData : 0;
    }, [filteredInventory]);
    // --- END FIX ---

    const projectCosts = useMemo(() => {
        const projects = {};
        filteredInventory.forEach(item => {
            projects[item.project_name] = (projects[item.project_name] || 0) + calculateCostForPeriod(item, selectedMonth);
        });
        return projects;
    }, [filteredInventory, selectedMonth]);

    const topProjectStat = useMemo(() => {
        const [name = 'N/A', cost = 0] = Object.entries(projectCosts)
            .reduce((max, entry) => (entry[1] > max[1] ? entry : max), ['', 0]);
        const projectDetails = inventory.find(p => p.project_name === name);
        const code = projectDetails ? projectDetails.project_code : '';
        return { name, cost, code };
    }, [projectCosts, inventory]);

    const serviceBreakdown = useMemo(() => {
        const services = {};
        filteredInventory.forEach(proj => {
            if (Array.isArray(proj.service_breakdown)) {
                proj.service_breakdown.forEach(serviceItem => {
                    const serviceName = serviceItem.service_description || serviceItem.sku_description || serviceItem.type || 'Unknown Service';
                    const cost = (selectedMonth === 'all')
                        ? parseFloat(serviceItem.cost || 0)
                        : (serviceItem.billing_month === selectedMonth ? parseFloat(serviceItem.cost || 0) : 0);
                    if (cost > 0) {
                        services[serviceName] = (services[serviceName] || 0) + cost;
                    }
                });
            }
        });
        return Object.entries(services)
            .map(([name, totalCost]) => ({ name, totalCost }))
            .sort((a, b) => b.totalCost - a.totalCost);
    }, [filteredInventory, selectedMonth]);
    
    const mainBarData = useMemo(() => {
        const calculateMonthlyCosts = (data) => {
            const monthlyCosts = {};
            months.forEach(m => { monthlyCosts[m] = 0; });
            data.forEach(item => { months.forEach(m => { monthlyCosts[m] += parseFloat(item[`${m}_cost`] || 0); }); });
            return months.map(m => monthlyCosts[m]);
        };
        
        const currentYearCosts = calculateMonthlyCosts(filteredInventory);
        const previousYearCosts = calculateMonthlyCosts(filteredPreviousYearInventory);

        return {
            labels: months.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
            datasets: [
                { 
                    label: `${selectedYear - 1}`, 
                    data: previousYearCosts, 
                    backgroundColor: previousYearColor 
                },
                { 
                    label: `${selectedYear}`, 
                    data: currentYearCosts, 
                    backgroundColor: colorPalette[0] 
                }
            ],
        };
    }, [filteredInventory, filteredPreviousYearInventory, selectedYear]);

    const rightChartData = useMemo(() => {
        const dataSet = selectedProjects.length === 1 ? serviceBreakdown : Object.entries(projectCosts).map(([name, cost])=>({name, totalCost:cost}));
        const sortedData = dataSet.sort((a, b) => b.totalCost - a.totalCost);
        const topN = 7;
        const topItems = sortedData.slice(0, topN);
        const otherCost = sortedData.slice(topN).reduce((sum, item) => sum + item.totalCost, 0);
        const labels = topItems.map(item => item.name);
        const data = topItems.map(item => item.totalCost);
        if (otherCost > 0.01) {
            labels.push('Other');
            data.push(otherCost);
        }
        return {
            labels,
            datasets: [{ data, backgroundColor: colorPalette, borderColor: '#ffffff', borderWidth: 2 }]
        };
    }, [projectCosts, serviceBreakdown, selectedProjects]);
    
    useEffect(() => {
        const mainChart = mainBarChartRef.current;
        const rightChart = rightChartRef.current;
        return () => {
            if (mainChart) mainChart.destroy();
            if (rightChart) rightChart.destroy();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleProjectSelection = (projectName) => {
        setSelectedProjects(prev =>
            prev.includes(projectName)
            ? prev.filter(p => p !== projectName)
            : [...prev, projectName]
        );
    };

    const handleBarClick = (event) => {
      if (!mainBarChartRef.current) return;
      const elements = getElementAtEvent(mainBarChartRef.current, event);
      if (elements.length > 0) {
        const monthIndex = elements[0].index;
        setSelectedMonth(months[monthIndex]);
      }
    };

    const chartOptionsBase = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
    };

    const mainBarOptions = {
        ...chartOptionsBase,
        plugins: { 
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${formatCurrency(value)}`;
                    }
                }
            }
        },
        scales: { 
            x: { stacked: false },
            y: { stacked: false, beginAtZero: true, ticks: { callback: value => formatCurrency(value) } } 
        }
    };

    const rightChartOptions = {
        ...chartOptionsBase,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Cost by ${selectedProjects.length === 1 ? 'Service' : 'Project'}` }
        }
    };
    
    const rightBarOptions = { ...rightChartOptions, indexAxis: 'y' };

    return (
        <div className="space-y-6">
            {/* --- FIX: Changed grid layout to accommodate four cards --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    <DollarSign size={40} className="text-green-600 mb-2 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800">Total Spend ({selectedMonth === 'all' ? selectedYear : selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)})</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalCostForPeriod)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    {costTrendData.isIncrease ? <TrendingUp size={40} className="text-red-500 mb-2 mx-auto" /> : <TrendingDown size={40} className="text-green-500 mb-2 mx-auto" />}
                    <h3 className="text-xl font-semibold text-gray-800">{costTrendData.title}</h3>
                    {costTrendData.hasValue ? (
                        <div>
                            <div className="flex items-center justify-center mt-1">
                                <p className={`text-3xl font-bold ${costTrendData.isIncrease ? 'text-red-500' : 'text-green-500'}`}>{costTrendData.percentage > 0 ? '+' : ''}{costTrendData.percentage}%</p>
                            </div>
                            <p className="text-sm text-gray-500">
                                {costTrendData.type === 'yoy' ? `vs ${selectedYear - 1}: ${formatCurrency(costTrendData.prevYearCost)}` : `Prev: ${formatCurrency(costTrendData.prevMonthCost)}`}
                            </p>
                        </div>
                    ) : (<p className="text-lg text-gray-500 mt-1">Not enough data for trend</p>)}
                </div>
                {/* --- FIX: Added new card for Average Monthly Spend --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    <BarChart size={40} className="text-purple-500 mb-2 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800">Avg. Monthly Spend ({selectedYear})</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(averageMonthlySpend)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    <Target size={40} className="text-indigo-500 mb-2 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800">Top Project</h3>
                    <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={topProjectStat.name}>{topProjectStat.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{topProjectStat.code || 'N/A'}</p>
                    <p className="text-lg font-semibold text-gray-700 mt-2">{formatCurrency(topProjectStat.cost)}</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-lg">
                <div className="relative" ref={dropdownRef}>
                    <div className="flex items-center">
                        <label className="font-semibold text-gray-700 mr-2">Projects:</label>
                        <button onClick={() => setIsProjectDropdownOpen(o => !o)} className="flex items-center justify-between min-w-[200px] p-2 border border-gray-300 rounded-lg bg-white">
                            <span>{selectedProjects.length === 0 ? 'All Projects' : `${selectedProjects.length} Selected`}</span><ChevronDown size={16} />
                        </button>
                    </div>
                    {isProjectDropdownOpen && (
                        <div className="absolute z-10 top-full mt-1 w-72 max-h-60 bg-white border rounded-lg shadow-xl flex flex-col">
                            <div className="p-2 border-b sticky top-0 bg-white"><input type="text" placeholder="Search projects..." className="w-full px-2 py-1 border rounded" value={projectSearchTerm} onChange={(e) => setProjectSearchTerm(e.target.value)} onClick={e => e.stopPropagation()}/></div>
                            <div className="p-2 flex justify-between border-b"><button onClick={() => { setSelectedProjects(projectNames); }} className="text-sm text-blue-600 hover:underline">Select All</button><button onClick={() => { setSelectedProjects([]); setProjectSearchTerm(''); }} className="text-sm text-blue-600 hover:underline">Clear All</button></div>
                            <div className="flex-1 overflow-y-auto">{filteredProjectNames.map(name => (<label key={name} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"><input type="checkbox" checked={selectedProjects.includes(name)} onChange={() => handleProjectSelection(name)} className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span className="text-sm text-gray-700">{name}</span></label>))}</div>
                        </div>
                    )}
                </div>
                <div className="flex items-center">
                    <label className="font-semibold text-gray-700 mr-2">Year:</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-lg">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <div className="flex items-center">
                    <label className="font-semibold text-gray-700 mr-2">Month:</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-gray-300 rounded-lg"><option value="all">All Months</option>{months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}</select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 truncate" title={`Monthly Cost Breakdown for ${projectTitleDisplay} (${selectedYear})`}>
                            Monthly Cost Breakdown for <span className="text-blue-600">{projectTitleDisplay}</span>
                        </h3>
                        {selectedMonth !== 'all' && (
                            <button onClick={() => setSelectedMonth('all')} className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-semibold">
                                <RefreshCw size={14} /> Show All Months
                            </button>
                        )}
                    </div>
                    <div className="h-96 relative">
                        <Bar
                            ref={mainBarChartRef}
                            key={`main-bar-${selectedProjects.join('_')}-${selectedYear}`}
                            data={mainBarData}
                            options={mainBarOptions}
                            onClick={handleBarClick}
                        />
                    </div>
                </div>
                
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                           {selectedProjects.length === 1 ? 'Service Breakdown' : 'Project Breakdown'}
                        </h3>
                        <div className="flex justify-center bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setRightChartView('bar')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${rightChartView === 'bar' ? 'bg-white shadow' : 'text-gray-600'}`}><BarChartHorizontal size={16} />Bar</button>
                            <button onClick={() => setRightChartView('pie')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${rightChartView === 'pie' ? 'bg-white shadow' : 'text-gray-600'}`}><PieChart size={16} />Pie</button>
                        </div>
                    </div>
                    <div className="relative flex-1 h-96">
                        {rightChartView === 'pie' ? (
                            <Pie
                                ref={rightChartRef}
                                key={`right-pie-${selectedProjects.join('_')}-${selectedMonth}`}
                                data={rightChartData}
                                options={rightChartOptions}
                            />
                        ) : (
                            <Bar
                                ref={rightChartRef}
                                key={`right-bar-${selectedProjects.join('_')}-${selectedMonth}`}
                                data={rightChartData}
                                options={rightBarOptions}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Detailed Service Breakdown</h3>
                <div className="overflow-y-auto max-h-[400px]">
                    <ServiceBreakdownView services={filteredInventory.flatMap(p => p.service_breakdown)} selectedMonth={selectedMonth} />
                </div>
            </div>
        </div>
    );
};
export default DashboardView;

