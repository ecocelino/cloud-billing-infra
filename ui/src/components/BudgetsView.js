import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { PiggyBank, Edit, CheckCircle, XCircle, Search } from 'lucide-react';
import { formatCurrency } from '../utils';
import Skeleton from './Skeleton'; // Assuming Skeleton.js is in the same components folder

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const BudgetBar = ({ budget, actual }) => {
    if (budget === 0 && actual === 0) {
        return <div className="text-xs text-gray-400 dark:text-gray-500 italic">No activity</div>;
    }

    const percentage = budget > 0 ? (actual / budget) * 100 : 101;
    const displayPercentage = Math.min(percentage, 100);

    let barColor = 'bg-green-500';
    if (percentage > 100) {
        barColor = 'bg-red-500';
    } else if (percentage > 75) {
        barColor = 'bg-yellow-500';
    }

    return (
        <div className="w-full">
            <div className="flex justify-between mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <span>{formatCurrency(actual)}</span>
                <span>{formatCurrency(budget)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                    className={`${barColor} h-2.5 rounded-full`}
                    style={{ width: `${displayPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const BudgetsSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-full mb-6" />

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="w-64 pr-4"><Skeleton className="h-6 w-full" /></th>
                            {[...Array(12)].map((_, i) => (
                                <th key={i} className="w-48 px-2"><Skeleton className="h-6 w-full" /></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                                <td className="py-4 pr-4">
                                    <Skeleton className="h-5 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </td>
                                {[...Array(12)].map((_, j) => (
                                    <td key={j} className="py-4 px-2">
                                        <Skeleton className="h-12 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center mt-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-56" />
            </div>
        </div>
    </div>
);

const BudgetsView = () => {
    const { yearlyBillingData, selectedYear, token, userRole, isBillingLoading } = useContext(GlobalStateContext);
    const [budgets, setBudgets] = useState({});
    const [editingBudgets, setEditingBudgets] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchBudgets = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/budgets/${selectedYear}`, {
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                const budgetData = await response.json();
                const budgetMap = {};
                budgetData.forEach(b => {
                    if (!budgetMap[b.project_id]) {
                        budgetMap[b.project_id] = {};
                    }
                    budgetMap[b.project_id][b.month] = b.amount;
                });
                setBudgets(budgetMap);
            }
        } catch (error) {
            console.error("Failed to fetch budgets:", error);
        }
    }, [token, selectedYear]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleBudgetChange = (projectId, month, value) => {
        const numericValue = value === '' ? '' : parseFloat(value);
        setEditingBudgets(prev => ({
            ...prev,
            [projectId]: {
                ...prev[projectId],
                [month]: numericValue,
            }
        }));
    };

    const handleSaveBudget = async (project, month) => {
        const amount = editingBudgets[project.project_id]?.[month];
        if (amount === undefined || amount === '') {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/budgets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ project_id: project.project_id, year: selectedYear, month, amount }),
            });
            if (response.ok) {
                fetchBudgets();
                setEditingBudgets(prev => {
                    const newProjectBudgets = { ...prev[project.project_id] };
                    delete newProjectBudgets[month];
                    return { ...prev, [project.project_id]: newProjectBudgets };
                });
            }
        } catch (error) {
            console.error("Failed to save budget:", error);
        }
    };

    const budgetTableData = useMemo(() => {
        return yearlyBillingData.map(project => {
            const projectBudgets = budgets[project.project_id] || {};
            const monthlyDetails = months.map(month => {
                const actual = project[`${month}_cost`] || 0;
                const budget = projectBudgets[month] || 0;
                const remaining = budget - actual;
                const isEditing = editingBudgets[project.project_id]?.[month] !== undefined;
                return { month, actual, budget, remaining, isEditing };
            });
            return { ...project, monthlyDetails };
        });
    }, [yearlyBillingData, budgets, editingBudgets]);

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return budgetTableData;
        return budgetTableData.filter(project =>
            (project.project_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, budgetTableData]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const currentData = filteredData.slice(startIdx, startIdx + rowsPerPage);

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    if (isBillingLoading) {
        return <BudgetsSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                        <PiggyBank className="mr-3 text-pink-500" />
                        Project Budgets for {selectedYear}
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                            placeholder="Search projects..."
                        />
                    </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Set monthly budgets for each project. Actual spend is pulled from billing data. All values are in USD.
                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10 w-64">Project</th>
                                {months.map(month => (
                                    <th key={month} className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-300 uppercase w-48">
                                        {month.toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentData.length > 0 ? (
                                currentData.map(project => (
                                    <tr key={project.project_id}>
                                        <td className="px-4 py-4 font-medium sticky left-0 bg-white dark:bg-gray-800">
                                            <div className="font-bold text-gray-800 dark:text-white">{project.project_code || 'N/A'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{project.project_name}</div>
                                        </td>
                                        {project.monthlyDetails.map(({ month, actual, budget, remaining, isEditing }) => (
                                            <td key={month} className="px-4 py-4 align-top">
                                                <div className="flex flex-col gap-2 text-gray-800 dark:text-gray-200">
                                                    {userRole !== 'user' && isEditing ? (
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                                                            <input
                                                                type="number"
                                                                value={editingBudgets[project.project_id]?.[month] ?? ''}
                                                                onChange={(e) => handleBudgetChange(project.project_id, month, e.target.value)}
                                                                className="w-full pl-5 p-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                                                placeholder="Set Budget"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <BudgetBar budget={budget} actual={actual} />
                                                            <div className="flex justify-between items-center mt-1">
                                                                <div className={`text-xs font-bold ${remaining < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                                    <span>{remaining < 0 ? "Over:" : "Left:"}</span>
                                                                    <span className="ml-1">{formatCurrency(Math.abs(remaining))}</span>
                                                                </div>
                                                                {userRole !== 'user' && (
                                                                    <button onClick={() => handleBudgetChange(project.project_id, month, budget)} className="p-1">
                                                                        <Edit size={14} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    {isEditing && (
                                                        <div className="flex justify-end gap-2 mt-1">
                                                            <button onClick={() => handleSaveBudget(project, month)}>
                                                                <CheckCircle size={18} className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"/>
                                                            </button>
                                                            <button onClick={() => handleBudgetChange(project.project_id, month, undefined)}>
                                                                <XCircle size={18} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={months.length + 1} className="text-center py-6 text-gray-400 dark:text-gray-500">
                                        No projects found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center mt-4 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</label>
                        <select
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Prev
                        </button>
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetsView;