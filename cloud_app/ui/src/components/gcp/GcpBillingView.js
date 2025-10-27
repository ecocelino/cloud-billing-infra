import React, { useState, useMemo, useContext } from 'react';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import { FileDown, X, ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const ServiceBreakdownView = ({ services, selectedMonth }) => {
    const [expandedServices, setExpandedServices] = useState({});

    const toggleService = (serviceName) => {
        setExpandedServices(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
    };

    const aggregatedServices = useMemo(() => {
        const serviceMap = new Map();
        const dataForMonth = services.filter(
            s => s.billing_month === selectedMonth && parseFloat(s.cost || 0) > 0
        );
        
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
        return <p className="text-gray-500 dark:text-gray-400 italic">No service costs recorded for this month.</p>;
    }

    return (
        <ul className="space-y-2">
            {aggregatedServices.map(([serviceName, data]) => (
                <li key={serviceName}>
                    <div
                        onClick={() => toggleService(serviceName)}
                        className="flex justify-between items-center cursor-pointer p-1 rounded hover:bg-slate-200 dark:hover:bg-gray-700"
                    >
                        <div className="flex items-center text-gray-800 dark:text-gray-100">
                            {expandedServices[serviceName] ? (
                                <ChevronDown size={16} className="mr-1 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <ChevronRight size={16} className="mr-1 text-gray-500 dark:text-gray-400" />
                            )}
                            <span className="font-bold">{serviceName}</span>
                        </div>
                        <span className="font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data.totalCost)}</span>
                    </div>
                    {expandedServices[serviceName] && (
                        <ul className="pl-6 mt-1 space-y-1">
                            {data.skus.sort((a,b) => b.cost - a.cost).map((sku, idx) => (
                                <li key={idx} className="flex justify-between border-l-2 pl-4 border-slate-300 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-300 text-sm">{sku.sku_description || 'N/A'}</span>
                                    <span className="font-small text-gray-600 dark:text-gray-300 text-sm">{formatCurrency(sku.cost)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
};

const getHeatmapColor = (value, min, max, isDarkMode) => {
  if (value === 0 || max === min) {
    return isDarkMode ? 'rgb(31 41 55)' : '#ffffff'; // gray-800 for dark, white for light
  }
  const percentage = (value - min) / (max - min);
  
  if (isDarkMode) {
    const lightness = 20 + (percentage * 35); // Dark blue to lighter blue
    return `hsl(221, 83%, ${lightness}%)`;
  } else {
    const lightness = 95 - (percentage * 50); // White to darker blue
    return `hsl(221, 83%, ${lightness}%)`;
  }
};

const GcpBillingView = () => {
  const { 
    yearlyBillingData: billingData, 
    selectedYear, 
    setSelectedYear, 
  } = useContext(GlobalStateContext);

  const [sortConfig, setSortConfig] = useState({ key: 'total_cost', direction: 'descending' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const processedBillingData = useMemo(() => {
    let minCost = Infinity;
    let maxCost = -Infinity;

    const dataWithTotals = billingData
      .filter(item => item.billing_year === selectedYear)
      .map(item => {
        let total_cost = 0;
        months.forEach(month => {
            const cost = parseFloat(item[`${month}_cost`] || 0);
            total_cost += cost;
            if(cost > 0) {
              if (cost < minCost) minCost = cost;
              if (cost > maxCost) maxCost = cost;
            }
        });
        return { ...item, total_cost };
      });
      
    if (sortConfig.key) {
        dataWithTotals.sort((a, b) => {
            const aValue = (sortConfig.key === 'project_name') ? a[sortConfig.key] : (a[sortConfig.key] || 0);
            const bValue = (sortConfig.key === 'project_name') ? b[sortConfig.key] : (b[sortConfig.key] || 0);

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    const grandTotal = {
        project_name: 'Grand Total',
        total_cost: 0
    };
    months.forEach(month => {
        const monthKey = `${month}_cost`;
        const monthlyTotal = dataWithTotals.reduce((sum, project) => sum + (project[monthKey] || 0), 0);
        grandTotal[monthKey] = monthlyTotal;
        grandTotal.total_cost += monthlyTotal;
    });

    return { data: dataWithTotals, minCost, maxCost, grandTotal };
  }, [billingData, selectedYear, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleExportCSV = () => {
    const headers = ['Project Name', ...months.map(m => m.toUpperCase()), 'Total'];
    
    const rows = processedBillingData.data.map(project => {
        const rowData = [
            `"${project.project_name.replace(/"/g, '""')}"`,
            ...months.map(month => project[`${month}_cost`] || 0)
        ];
        rowData.push(project.total_cost);
        return rowData.join(',');
    });

    rows.push('');

    const grandTotal = processedBillingData.grandTotal;
    const grandTotalRowData = [
        `"${grandTotal.project_name}"`,
        ...months.map(month => grandTotal[`${month}_cost`] || 0)
    ];
    grandTotalRowData.push(grandTotal.total_cost);
    rows.push(grandTotalRowData.join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_overview_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCellClick = (project, month) => {
    const cost = project[`${month}_cost`] || 0;
    if (cost > 0) {
        setModalData({ project, month });
        setIsModalOpen(true);
    }
  };

  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg printable-content">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Monthly Billing Overview</h3>
            <div className="flex items-center gap-4">
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={handleExportCSV} disabled={processedBillingData.data.length === 0} className="p-2 bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                <FileDown size={18} /> Export CSV
              </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          {processedBillingData.data.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-10">No billing data found for {selectedYear}.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th onClick={() => requestSort('project_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center gap-2">Project Name</div>
                  </th>
                  {months.map(month => 
                      <th key={month} onClick={() => requestSort(`${month}_cost`)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                          <div className="flex items-center gap-2">{month.toUpperCase()}</div>
                      </th>
                  )}
                  <th onClick={() => requestSort('total_cost')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky right-0 bg-gray-50 dark:bg-gray-700 z-10 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center gap-2">Total</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {processedBillingData.data.map(row => (
                  <tr key={row.project_name}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium sticky left-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{row.project_name}</td>
                    {months.map(month => {
                      const cost = row[`${month}_cost`] || 0;
                      const bgColor = getHeatmapColor(cost, processedBillingData.minCost, processedBillingData.maxCost, isDarkMode);
                      const textColorClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
                      return (
                          <td key={month} className="px-6 py-4 whitespace-nowrap" style={{ backgroundColor: bgColor }}>
                              <button 
                                onClick={() => handleCellClick(row, month)} 
                                disabled={cost === 0}
                                className={`w-full text-left ${textColorClass} disabled:cursor-not-allowed`}
                              >
                                  {formatCurrency(cost)}
                              </button>
                          </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap font-bold sticky right-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{formatCurrency(row.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-100">
                <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-right sticky left-0 bg-gray-100 dark:bg-gray-700">{processedBillingData.grandTotal.project_name}</td>
                    {months.map(month => (
                        <td key={month} className="px-6 py-4 whitespace-nowrap">
                            {formatCurrency(processedBillingData.grandTotal[`${month}_cost`] || 0)}
                        </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-gray-100 dark:bg-gray-700">{formatCurrency(processedBillingData.grandTotal.total_cost)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      
      {isModalOpen && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Service Breakdown
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {modalData.project.project_name} - {modalData.month.charAt(0).toUpperCase() + modalData.month.slice(1)} {selectedYear}
                        </p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                <div className="overflow-y-auto pr-2">
                    <ServiceBreakdownView 
                        services={modalData.project.service_breakdown}
                        selectedMonth={modalData.month}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GcpBillingView;