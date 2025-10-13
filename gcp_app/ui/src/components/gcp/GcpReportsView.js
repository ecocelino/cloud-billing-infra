import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import { ScrollText, Loader2, Download, FileDown } from 'lucide-react';
import { formatCurrency } from '../../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Skeleton from '../shared/Skeleton';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const years = [2023, 2024, 2025, 2026, 2027];
const colorPalette = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#64748b', '#f59e0b', '#d946ef'];


const GcpReportsView = () => {
    const { token, selectedYear, setSelectedYear, selectedPlatform } = useContext(GlobalStateContext);
    const [reportData, setReportData] = useState([]);
    const [groupBy, setGroupBy] = useState('team');
    const [isLoading, setIsLoading] = useState(true);
    const [quarter, setQuarter] = useState('all');

    useEffect(() => {
        const fetchReportData = async () => {
            if (!token || !selectedPlatform) return;
            setIsLoading(true);
            try {
                let url = `/api/reports/grouped_cost?groupBy=${groupBy}&year=${selectedYear}&platform=${selectedPlatform}`;
                if (quarter !== 'all') {
                    url += `&quarter=${quarter}`;
                }
                const response = await fetch(url, {
                    headers: { 'x-access-token': token }
                });
                if (response.ok) {
                    setReportData(await response.json());
                } else {
                    console.error("Failed to fetch report data");
                    setReportData([]);
                }
            } catch (error) {
                console.error("Error fetching report data:", error);
                setReportData([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReportData();
    }, [token, selectedYear, groupBy, quarter, selectedPlatform]);

    const reportTitle = `Cost Report by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} for ${selectedYear}${quarter !== 'all' ? ` - ${quarter}` : ''}`;
    const exportFilename = `cost_report_${groupBy}_${selectedYear}${quarter !== 'all' ? `_${quarter}` : ''}`;

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const groupByName = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
        
        doc.setFontSize(18);
        doc.text(reportTitle, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [[groupByName, 'Total Cost (USD)']],
            body: reportData.map(row => [row.groupName, formatCurrency(row.totalCost)]),
            headStyles: { fillColor: [22, 163, 74] },
            footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold'},
            foot: [
                ['Grand Total', formatCurrency(reportData.reduce((sum, row) => sum + row.totalCost, 0))]
            ]
        });

        doc.save(`${exportFilename}.pdf`);
    };
    
    const handleExportCSV = () => {
        const headers = [groupBy.charAt(0).toUpperCase() + groupBy.slice(1), 'TotalCost'];
        const rows = reportData.map(row => [
            `"${row.groupName.replace(/"/g, '""')}"`,
            row.totalCost
        ]);

        const grandTotal = reportData.reduce((sum, row) => sum + row.totalCost, 0);
        rows.push(['"Grand Total"', grandTotal]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${exportFilename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isDarkMode = document.documentElement.classList.contains('dark');

    const chartData = useMemo(() => {
        const topN = 7;
        const sortedData = [...reportData].sort((a, b) => b.totalCost - a.totalCost);
        
        const topItems = sortedData.slice(0, topN);
        const otherItems = sortedData.slice(topN);

        const labels = topItems.map(item => item.groupName);
        const data = topItems.map(item => item.totalCost);

        if (otherItems.length > 0) {
            labels.push('Other');
            data.push(otherItems.reduce((sum, item) => sum + item.totalCost, 0));
        }

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colorPalette,
                borderColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [reportData, isDarkMode]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: isDarkMode ? '#e5e7eb' : '#374151'
                }
            }
        }
    };
    
    const GroupByButton = ({ value, label }) => (
        <button 
            onClick={() => setGroupBy(value)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md ${groupBy === value ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}
        >
            {label}
        </button>
    );

    const QuarterButton = ({ value, label }) => (
        <button 
            onClick={() => setQuarter(value)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md ${quarter === value ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <ScrollText className="mr-3" /> Cost Reports
            </h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Year:</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-200">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Period:</label>
                            <div className="flex justify-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                <QuarterButton value="all" label="Yearly" />
                                <QuarterButton value="Q1" label="Q1" />
                                <QuarterButton value="Q2" label="Q2" />
                                <QuarterButton value="Q3" label="Q3" />
                                <QuarterButton value="Q4" label="Q4" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Group By:</label>
                            <div className="flex justify-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                <GroupByButton value="team" label="Team" />
                                <GroupByButton value="owner" label="Owner" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportCSV} disabled={isLoading || reportData.length === 0} className="flex items-center gap-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 disabled:bg-gray-400">
                            <FileDown size={18} />
                            Export CSV
                        </button>
                        <button onClick={handleExportPDF} disabled={isLoading || reportData.length === 0} className="flex items-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                            <Download size={18} />
                            Export PDF
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                         <div className="lg:col-span-2"><Skeleton className="h-80 w-full" /></div>
                         <div className="lg:col-span-3 space-y-2">
                            {/* 🔹 UPDATED: Added unique key to skeleton */}
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                         </div>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        <p>No report data found for the selected filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Cost Distribution</h3>
                            <div className="relative h-80">
                                <Pie data={chartData} options={chartOptions} />
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {reportData.map((row) => (
                                            <tr key={row.groupName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{row.groupName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(row.totalCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
                                        <tr>
                                            <td className="px-6 py-4 text-right text-gray-800 dark:text-gray-100">Grand Total</td>
                                            <td className="px-6 py-4 text-right text-lg text-gray-900 dark:text-white">
                                                {formatCurrency(reportData.reduce((sum, row) => sum + row.totalCost, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GcpReportsView;