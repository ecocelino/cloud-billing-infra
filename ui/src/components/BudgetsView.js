import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { PiggyBank, Edit, CheckCircle, XCircle, Search } from 'lucide-react';
import { formatCurrency } from '../utils';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const BudgetsView = () => {
    const { yearlyBillingData, selectedYear, token, userRole } = useContext(GlobalStateContext);
    const [budgets, setBudgets] = useState({});
    const [editingBudgets, setEditingBudgets] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    // 🔹 Pagination states
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

    // 🔍 Filter projects by search term
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return budgetTableData;
        return budgetTableData.filter(project =>
            (project.project_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, budgetTableData]);

    // 🔹 Pagination calculations
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const currentData = filteredData.slice(startIdx, startIdx + rowsPerPage);

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1); // reset to first page
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                        <PiggyBank className="mr-3 text-pink-500" />
                        Project Budgets for {selectedYear}
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1 border rounded-md text-sm"
                            placeholder="Search projects..."
                        />
                    </div>
                </div>

                <p className="text-gray-600 mb-4">
                    Set monthly budgets for each project. Actual spend is pulled from billing data. All values are in USD.
                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 w-64">Project</th>
                                {months.map(month => (
                                    <th key={month} className="px-4 py-3 text-center font-medium text-gray-500 uppercase w-48">
                                        {month.toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentData.length > 0 ? (
                                currentData.map(project => (
                                    <tr key={project.project_id}>
                                        <td className="px-4 py-4 font-medium sticky left-0 bg-white">
                                            <div className="font-bold text-gray-800">{project.project_code || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{project.project_name}</div>
                                        </td>
                                        {project.monthlyDetails.map(({ month, actual, budget, remaining, isEditing }) => (
                                            <td key={month} className="px-4 py-4">
                                                <div className="flex flex-col gap-2">
                                                    {userRole !== 'user' && isEditing ? (
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                            <input
                                                                type="number"
                                                                value={editingBudgets[project.project_id]?.[month] ?? ''}
                                                                onChange={(e) => handleBudgetChange(project.project_id, month, e.target.value)}
                                                                className="w-full pl-5 p-1 border rounded-md"
                                                                placeholder="Set Budget"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-gray-500">Budget:</span>
                                                            <div className="flex items-center gap-2">
                                                                <span>{formatCurrency(budget)}</span>
                                                                {userRole !== 'user' && (
                                                                    <button onClick={() => handleBudgetChange(project.project_id, month, budget)}>
                                                                        <Edit size={14} className="text-gray-400 hover:text-blue-600" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Actual:</span>
                                                        <span>{formatCurrency(actual)}</span>
                                                    </div>
                                                    <div className={`flex justify-between font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        <span>{remaining < 0 ? "Over:" : "Left:"}</span>
                                                        <span>{formatCurrency(Math.abs(remaining))}</span>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="flex justify-end gap-2 mt-1">
                                                            <button onClick={() => handleSaveBudget(project, month)}>
                                                                <CheckCircle size={18} className="text-green-500 hover:text-green-700"/>
                                                            </button>
                                                            <button onClick={() => handleBudgetChange(project.project_id, month, undefined)}>
                                                                <XCircle size={18} className="text-red-500 hover:text-red-700"/>
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
                                    <td colSpan={months.length + 1} className="text-center py-6 text-gray-400">
                                        No projects found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 🔹 Pagination Controls */}
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Rows per page:</label>
                        <select
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                            className="border rounded-md px-2 py-1 text-sm"
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
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1 border rounded disabled:opacity-50"
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
