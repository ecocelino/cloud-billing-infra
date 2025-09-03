import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
import { DollarSign, ChevronDown, TrendingUp, TrendingDown, Target, PieChart, BarChartHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils.js';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];
const colorPalette = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#64748b', '#f59e0b', '#ec4899', '#84cc16'];

const DashboardView = ({ inventory = [], selectedYear, setSelectedYear }) => {
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    const [mainChartView, setMainChartView] = useState('bar');
    const [monthlyBreakdown, setMonthlyBreakdown] = useState('service');
    const dropdownRef = useRef(null);

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

    const calculateCostForPeriod = (item, month) => {
        if (month === 'all') {
            return months.reduce((sum, m) => sum + parseFloat(item[`${m}_cost`] || 0), 0);
        }
        return parseFloat(item[`${month}_cost`] || 0);
    };

    const totalCostForPeriod = useMemo(() => {
        return filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, selectedMonth), 0);
    }, [filteredInventory, selectedMonth]);

    const costTrend = useMemo(() => {
        if (selectedMonth === 'all' || months.indexOf(selectedMonth) === 0) {
            return { percentage: 0, prevMonthCost: 0, isIncrease: false, hasValue: false };
        }
        const currentMonthIndex = months.indexOf(selectedMonth);
        const prevMonth = months[currentMonthIndex - 1];
        const currentMonthCost = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, selectedMonth), 0);
        const prevMonthCost = filteredInventory.reduce((total, item) => total + calculateCostForPeriod(item, prevMonth), 0);
        if (prevMonthCost === 0) {
            return { percentage: currentMonthCost > 0 ? 100 : 0, prevMonthCost, isIncrease: currentMonthCost > 0, hasValue: true };
        }
        const percentage = ((currentMonthCost - prevMonthCost) / prevMonthCost) * 100;
        return { percentage: Math.round(percentage), prevMonthCost, isIncrease: percentage > 0, hasValue: true };
    }, [filteredInventory, selectedMonth]);

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
        return { name, cost };
    }, [projectCosts]);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    
    const handleProjectSelection = (projectName) => {
        setSelectedProjects(prev =>
            prev.includes(projectName)
            ? prev.filter(p => p !== projectName)
            : [...prev, projectName]
        );
    };
    
    const barData = useMemo(() => {
        if (selectedMonth !== 'all') {
            if (monthlyBreakdown === 'service') {
                const topServices = serviceBreakdown.slice(0, 15);
                return {
                    labels: topServices.map(s => s.name),
                    datasets: [{ label: `Cost for ${selectedMonth.toUpperCase()}`, data: topServices.map(s => s.totalCost), backgroundColor: colorPalette[1] }],
                };
            }
            if (monthlyBreakdown === 'project') {
                const projectsWithCost = Object.entries(projectCosts).filter(([, cost]) => cost > 0).map(([name, cost]) => ({ name, cost }));
                return {
                    labels: [selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)],
                    datasets: projectsWithCost.map((proj, index) => ({
                        label: proj.name,
                        data: [proj.cost],
                        backgroundColor: colorPalette[index % colorPalette.length],
                    })),
                };
            }
        }
        if (selectedProjects.length === 1) {
            const project = filteredInventory[0];
            const servicesInProject = {};
            if (project && Array.isArray(project.service_breakdown)) {
                project.service_breakdown.forEach(item => {
                    const serviceName = item.service_description || item.sku_description || item.type || 'Unknown';
                    if (!servicesInProject[serviceName]) { servicesInProject[serviceName] = Array(12).fill(0); }
                    const monthIndex = months.indexOf(item.billing_month);
                    if (monthIndex > -1) { servicesInProject[serviceName][monthIndex] += parseFloat(item.cost || 0); }
                });
            }
            return {
                labels: months.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
                datasets: Object.entries(servicesInProject).map(([serviceName, monthlyData], index) => ({
                    label: serviceName, data: monthlyData, backgroundColor: colorPalette[index % colorPalette.length],
                })),
            };
        }
        if (selectedProjects.length > 1) {
            return {
                labels: months.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
                datasets: selectedProjects.map((projectName, index) => ({
                    label: projectName,
                    data: months.map(m => inventory.find(p => p.project_name === projectName)?.[`${m}_cost`] || 0),
                    backgroundColor: colorPalette[index % colorPalette.length],
                })),
            };
        }
        const monthlyCosts = {};
        months.forEach(m => { monthlyCosts[m] = 0; });
        filteredInventory.forEach(item => { months.forEach(m => { monthlyCosts[m] += parseFloat(item[`${m}_cost`] || 0); }); });
        return {
            labels: months.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
            datasets: [{ label: `Total Monthly Cost`, data: months.map(m => monthlyCosts[m]), backgroundColor: colorPalette[0] }],
        };
    }, [filteredInventory, selectedProjects, inventory, selectedMonth, serviceBreakdown, projectCosts, monthlyBreakdown]);

    const pieData = useMemo(() => {
        const dataSet = mainChartView === 'pie' ? serviceBreakdown : Object.entries(projectCosts).map(([name, cost])=>({name, totalCost:cost}));
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
    }, [projectCosts, serviceBreakdown, mainChartView]);

    const barOptions = useMemo(() => ({
        responsive: true, maintainAspectRatio: false,
        plugins: { 
            legend: { display: selectedProjects.length !== 0 || selectedMonth !== 'all' },
            tooltip: { callbacks: { 
                label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.parsed.y)}`,
                footer: (tooltipItems) => {
                    if (tooltipItems.length <= 1) return '';
                    let sum = tooltipItems.reduce((total, item) => total + item.parsed.y, 0);
                    return 'Total: ' + formatCurrency(sum);
                },
            }}
        },
        scales: { 
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true, ticks: { callback: value => formatCurrency(value) } }
        }
    }), [selectedProjects, selectedMonth]);
    
    const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    <DollarSign size={40} className="text-green-600 mb-2 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800">Total Spend ({selectedMonth === 'all' ? 'All Months' : selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)})</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalCostForPeriod)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    {costTrend.isIncrease ? <TrendingUp size={40} className="text-red-500 mb-2 mx-auto" /> : <TrendingDown size={40} className="text-green-500 mb-2 mx-auto" />}
                    <h3 className="text-xl font-semibold text-gray-800">MoM Trend</h3>
                    {costTrend.hasValue ? (
                        <div>
                            <div className="flex items-center justify-center mt-1"><p className={`text-3xl font-bold ${costTrend.isIncrease ? 'text-red-500' : 'text-green-500'}`}>{costTrend.percentage > 0 ? '+' : ''}{costTrend.percentage}%</p></div>
                            <p className="text-sm text-gray-500">Prev: {formatCurrency(costTrend.prevMonthCost)}</p>
                        </div>
                    ) : (<p className="text-lg text-gray-500 mt-1">Select a month to see trend</p>)}
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                    <Target size={40} className="text-indigo-500 mb-2 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800">Top Project</h3>
                    <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={topProjectStat.name}>{topProjectStat.name}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(topProjectStat.cost)}</p>
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
                <div className={`bg-white p-6 rounded-xl shadow-lg ${selectedProjects.length === 1 && selectedMonth === 'all' ? 'lg:col-span-5' : 'lg:col-span-3'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {selectedMonth !== 'all' ? `Costs for ${selectedMonth.toUpperCase()}` : (selectedProjects.length === 1 ? `Service Breakdown for ${selectedProjects[0]}`: (mainChartView === 'pie' ? 'Service Cost Breakdown' : 'Monthly Cost Breakdown'))}
                        </h3>
                        {(selectedMonth !== 'all' || selectedProjects.length === 1) && (
                            <div className="flex justify-center bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setMainChartView('bar')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${mainChartView === 'bar' ? 'bg-white shadow' : 'text-gray-600'}`}><BarChartHorizontal size={16} />Bar</button>
                                <button onClick={() => setMainChartView('pie')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${mainChartView === 'pie' ? 'bg-white shadow' : 'text-gray-600'}`}><PieChart size={16} />Pie</button>
                            </div>
                        )}
                    </div>
                    <div className="h-96 relative">
                        {mainChartView === 'bar' && <Bar data={barData} options={barOptions} />}
                        {mainChartView === 'pie' && <Pie data={pieData} options={{...pieOptions, plugins: {...pieOptions.plugins, title: {display: true, text: 'Cost Breakdown by Service'}}}} />}
                    </div>
                </div>
                
                {selectedProjects.length !== 1 && (
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Project Cost Breakdown</h3>
                        <div className="relative flex-1 h-96">
                           <Pie data={pieData} options={{...pieOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Detailed Service Breakdown</h3>
                <div className="overflow-y-auto max-h-[400px]">
                    {serviceBreakdown.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">{serviceBreakdown.map(service => (<tr key={service.name}><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{service.name}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right font-medium">{formatCurrency(service.totalCost)}</td></tr>))}</tbody>
                        </table>
                    ) : (<p className="text-gray-500 text-center mt-4">No service data to display for the current selection.</p>)}
                </div>
            </div>
        </div>
    );
};
export default DashboardView;