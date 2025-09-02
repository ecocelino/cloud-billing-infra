import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { DollarSign, Cloud } from 'lucide-react';
import { formatCurrency } from '../utils.js'; // <-- UPDATED IMPORT



const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];
const platforms = ['GCP', 'AWS'];


const DashboardView = ({ inventory, totalCost }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedPlatform, setSelectedPlatform] = useState('GCP');

    // Aggregate costs by month for the selected platform and year
    const monthlyCosts = useMemo(() => {
        const costs = {};
        months.forEach(m => { costs[m] = 0; });
        inventory.forEach(item => {
            if (item.platform === selectedPlatform && item.billing_year === selectedYear) {
                months.forEach(m => {
                    if (item[`${m}_cost`] !== undefined) {
                        costs[m] += parseFloat(item[`${m}_cost`] || 0);
                    }
                });
            }
        });
        return costs;
    }, [inventory, selectedYear, selectedPlatform]);

    const barData = {
        labels: months.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
        datasets: [
            {
                label: `${selectedPlatform} Monthly Cost (${selectedYear})`,
                data: months.map(m => monthlyCosts[m]),
                backgroundColor: selectedPlatform === 'GCP' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(59, 130, 246, 0.7)',
            },
        ],
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: `${selectedPlatform} Monthly Cost (${selectedYear})` },
        },
        scales: {
            y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value) } },
        },
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                    <DollarSign size={40} className="text-green-600 mb-2" />
                    <h3 className="text-xl font-semibold text-gray-800">Total Inventory Cost</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalCost)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                    <Cloud size={40} className="text-cyan-600 mb-2" />
                    <h3 className="text-xl font-semibold text-gray-800">Total Resources</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{inventory.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                    <DollarSign size={40} className="text-red-600 mb-2" />
                    <h3 className="text-xl font-semibold text-gray-800">Most Expensive Resource</h3>
                    <p className="text-lg font-bold text-gray-900 mt-1">{inventory.length > 0 ? inventory.reduce((a, b) => a.cost > b.cost ? a : b).name : 'N/A'}</p>
                    <p className="text-sm text-gray-500">{inventory.length > 0 ? `${formatCurrency(inventory.reduce((a, b) => a.cost > b.cost ? a : b).cost)} / month` : ''}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
                <div className="flex items-center mb-4 space-x-4">
                    <label className="font-semibold">Platform:</label>
                    <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="p-2 border border-gray-300 rounded-lg">
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <label className="ml-4 font-semibold">Year:</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-lg">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <Bar data={barData} options={barOptions} />
            </div>
        </div>
    );
};

export default DashboardView;