import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { ChevronRight, ChevronDown, FileDown, X } from 'lucide-react';
import { formatCurrency } from '../utils.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const ServiceBreakdownView = ({ services, selectedMonth, isPrinting = false }) => {
    const [expandedServices, setExpandedServices] = useState({});

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

    useEffect(() => {
        if (isPrinting) {
            const allServices = {};
            aggregatedServices.forEach(([serviceName]) => {
                allServices[serviceName] = true;
            });
            setExpandedServices(allServices);
        }
    }, [isPrinting, aggregatedServices]);

    const toggleService = (serviceName) => {
        setExpandedServices(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
    };

    if (aggregatedServices.length === 0) {
        return <p className="text-gray-500 italic no-print">No service costs recorded for this month.</p>;
    }

    return (
        <ul className="space-y-2">
            {aggregatedServices.map(([serviceName, data]) => (
                <li key={serviceName}>
                    <div
                        onClick={() => toggleService(serviceName)}
                        className="flex justify-between items-center cursor-pointer p-1 rounded hover:bg-slate-200 no-print"
                    >
                        <div className="flex items-center">
                            {(isPrinting || expandedServices[serviceName]) ? (
                                <ChevronDown size={16} className="mr-1 text-gray-500" />
                            ) : (
                                <ChevronRight size={16} className="mr-1 text-gray-500" />
                            )}
                            <span className="font-bold text-gray-800">{serviceName}</span>
                        </div>
                        <span className="font-bold text-gray-800">{formatCurrency(data.totalCost)}</span>
                    </div>
                    <div className="hidden print:flex justify-between items-center p-1">
                        <span className="font-bold text-gray-800 pl-5 text-lg">{serviceName}</span>
                        <span className="font-bold text-gray-800 text-lg">{formatCurrency(data.totalCost)}</span>
                    </div>

                    {(isPrinting || expandedServices[serviceName]) && (
                        <ul className="pl-6 mt-1 space-y-1">
                            {data.skus.sort((a,b) => b.cost - a.cost).map((sku, idx) => (
                                <li key={idx} className="flex justify-between border-l-2 pl-4 border-slate-300">
                                    <span className="text-gray-600 text-sm">{sku.sku_description || 'N/A'}</span>
                                    <span className="font-small text-gray-600 text-sm">{formatCurrency(sku.cost)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
};

const ProjectsView = () => {
    const { yearlyBillingData: yearlyData, selectedYear, setSelectedYear, envFilter, token, userRole } = useContext(GlobalStateContext);

    const [editingProject, setEditingProject] = useState(null);
    const [projectMeta, setProjectMeta] = useState({});
    const [expandedProjects, setExpandedProjects] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMonth, setSelectedMonth] = useState('');
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportBy, setExportBy] = useState('projectName');
    const [selectedForExport, setSelectedForExport] = useState([]);
    const [exportSearchTerm, setExportSearchTerm] = useState("");
    const [isPrinting, setIsPrinting] = useState(false);
    const selectAllRef = useRef(null);

    const filteredProjectData = useMemo(() => {
        let dataForYear = yearlyData.filter(p => p.billing_year === selectedYear);
        let filtered = dataForYear;
        if (envFilter !== 'all') {
            const envLower = envFilter === 'prod' ? 'production' : 'non-production';
            filtered = filtered.filter(p => (projectMeta[p.project_name]?.environment || '').toLowerCase() === envLower);
        }
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter(project => {
                const meta = projectMeta[project.project_name] || {};
                return (
                    project.project_name.toLowerCase().includes(term) ||
                    (meta.projectCode || '').toLowerCase().includes(term) ||
                    (meta.environment || '').toLowerCase().includes(term) ||
                    (meta.owner || '').toLowerCase().includes(term) ||
                    (meta.team || '').toLowerCase().includes(term)
                );
            });
        }
        if (selectedMonth) {
            return filtered.filter(p => (p[`${selectedMonth}_cost`] || 0) > 0);
        }
        return filtered;
    }, [yearlyData, searchTerm, envFilter, projectMeta, selectedYear, selectedMonth]);

    const exportableItems = useMemo(() => {
        const items = new Set();
        filteredProjectData.forEach(p => {
            const identifier = exportBy === 'projectName' ? p.project_name : (projectMeta[p.project_name]?.projectCode || '');
            if(identifier) items.add(identifier);
        });
        const term = exportSearchTerm.trim().toLowerCase();
        if (!term) return [...items].sort();
        return [...items].filter(item => item.toLowerCase().includes(term)).sort();
    }, [filteredProjectData, exportBy, projectMeta, exportSearchTerm]);
    
    const projectsIncludedText = useMemo(() => {
        if (selectedForExport.length === 0) {
            return 'All Filtered Projects';
        }
        if (exportBy === 'projectCode') {
            return selectedForExport.join(', ');
        }
        return `${selectedForExport.length} Selected Project(s)`;
    }, [selectedForExport, exportBy]);

    const fetchMeta = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/projects/meta/all`, { headers: { 'x-access-token': token } });
            if (response.ok) {
                setProjectMeta(await response.json());
            } else {
                console.error("Failed to fetch project metadata. Status:", response.status);
            }
        } catch (err) { 
            console.error("An error occurred while fetching project metadata", err);
        }
    }, [token]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        if (selectAllRef.current) {
            const isAllSelected = exportableItems.length > 0 && selectedForExport.length === exportableItems.length;
            const someSelected = selectedForExport.length > 0 && !isAllSelected;
            selectAllRef.current.indeterminate = someSelected;
            selectAllRef.current.checked = isAllSelected;
        }
    }, [selectedForExport, exportableItems]);

    const saveProjectMeta = async (projectName) => {
        const meta = projectMeta[projectName] || {};
        try {
          await fetch(`${API_BASE_URL}/projects/meta`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-access-token': token },
            body: JSON.stringify({
              project_name: projectName,
              project_code: meta.projectCode || '',
              environment: meta.environment || '',
              owner: meta.owner || '',
              team: meta.team || ''
            })
          });
        } catch (err) { console.error("Failed to save project metadata", err); }
    };
    
    const toggleProject = (projectName) => {
        setExpandedProjects(prev => ({ ...prev, [projectName]: !prev[projectName] }));
    };

    const handleExportSelection = (identifier) => {
        setSelectedForExport(prev => 
            prev.includes(identifier) ? prev.filter(item => item !== identifier) : [...prev, identifier]
        );
    };
    
    const handleSelectAll = () => {
        const isAllSelected = exportableItems.length > 0 && selectedForExport.length === exportableItems.length;
        if (isAllSelected) {
            setSelectedForExport([]);
        } else {
            setSelectedForExport(exportableItems);
        }
    };

    const getProjectsToExport = useMemo(() => {
        if (selectedForExport.length === 0) return filteredProjectData;
        return filteredProjectData.filter(p => {
            const identifier = exportBy === 'projectName' ? p.project_name : (projectMeta[p.project_name]?.projectCode || '');
            return selectedForExport.includes(identifier);
        });
    }, [selectedForExport, filteredProjectData, exportBy, projectMeta]);

    const handleExportCSV = () => {
        const projectsToExport = getProjectsToExport;
        if (projectsToExport.length === 0) { alert('No projects match your selection for export.'); return; }
        
        let csvContent = "Project,Project Code,Environment,Owner,Team,Service,SKU,Cost\n";
        projectsToExport.forEach(p => {
            const meta = projectMeta[p.project_name] || {};
            let projectTotal = 0;
            p.service_breakdown
              .filter(s => s.billing_month === selectedMonth && parseFloat(s.cost || 0) > 0)
              .forEach(s => {
                  const cost = parseFloat(s.cost || 0);
                  projectTotal += cost;
                  const row = [
                    `"${p.project_name}"`,
                    `"${meta.projectCode || ''}"`,
                    `"${meta.environment || ''}"`,
                    `"${meta.owner || ''}"`,
                    `"${meta.team || ''}"`,
                    `"${s.service_description || s.type || 'N/A'}"`,
                    `"${s.sku_description || 'N/A'}"`,
                    cost
                  ].join(',');
                  csvContent += row + '\n';
              });
            csvContent += `,,,,,,Total,"${projectTotal}"\n`;
        });
    
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `project_export_${selectedYear}_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        if (getProjectsToExport.length === 0) { alert('No projects match your selection for export.'); return; }
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    const projectsToDisplay = isPrinting ? getProjectsToExport : filteredProjectData;
    const grandTotalToDisplay = projectsToDisplay.reduce((sum, p) => sum + (p[`${selectedMonth}_cost`] || 0), 0);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="no-print">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Projects Overview</h3>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Select Month...</option>
                        {months.map(m => (
                        <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="p-2 border border-gray-300 rounded-lg"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="p-2 border border-gray-300 rounded-lg flex-grow"
                    />

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        disabled={!selectedMonth}
                        className="p-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:bg-gray-400"
                    >
                        <FileDown size={18} /> Export
                    </button>
                </div>
            </div>
      
            {!selectedMonth ? (
                <div className="text-center py-10 text-gray-500 no-print">Please select a month to view project data.</div>
            ) : (
                <div className={`printable-area ${isPrinting ? '' : 'overflow-x-auto'}`}>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4 hidden print:block text-center">
                        Project Cost Report
                    </h3>
          
                    <div className="hidden print:block mb-6">
                        <h4 className="text-xl font-semibold text-gray-800">Report Summary</h4>
                        <div className="text-base text-gray-700 border-t pt-2 mt-2 space-y-1">
                            <p><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</p>
                            <p><strong>Year | Month:</strong> {selectedYear} | {selectedMonth.toUpperCase()}</p>
                            <p>
                                <strong>
                                {exportBy === 'projectCode' ? 'Project Codes Included:' : 'Projects Included:'}
                                </strong>
                                {' '}{projectsIncludedText}
                            </p>
                            <p><strong>Grand Total:</strong> {formatCurrency(grandTotalToDisplay)}</p>
                        </div>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 print:table-row-group">
                            <tr>
                                <th className="w-8 no-print"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Total Cost ({selectedMonth.toUpperCase()})
                                </th>
                                {(userRole === 'admin' || userRole === 'superadmin') && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-base">
                            {projectsToDisplay.map((project) => (
                                <React.Fragment key={project.project_name}>
                                <tr
                                    onClick={() => toggleProject(project.project_name)}
                                    className="cursor-pointer hover:bg-gray-50 print:break-inside-avoid"
                                >
                                    <td className="px-4 py-4 no-print">
                                        {expandedProjects[project.project_name] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-base">{project.project_name}</td>
                                    {['projectCode', 'environment', 'owner', 'team'].map(field => (
                                    <td key={field} className="px-6 py-4 whitespace-nowrap">
                                        <span className="no-print">
                                        {editingProject === project.project_name && (userRole === 'admin' || userRole === 'superadmin') ? (
                                            <input
                                            type="text"
                                            value={projectMeta[project.project_name]?.[field] || ''}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => setProjectMeta(meta => ({
                                                ...meta,
                                                [project.project_name]: { ...meta[project.project_name], [field]: e.target.value }
                                            }))}
                                            placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace('Code', ' Code')}
                                            className="p-1 border border-gray-300 rounded w-24 text-base"
                                            />
                                        ) : (
                                            <span>{projectMeta[project.project_name]?.[field] || ''}</span>
                                        )}
                                        </span>
                                        <span className="hidden print:inline text-base">{projectMeta[project.project_name]?.[field] || ''}</span>
                                    </td>
                                    ))}
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600 text-base">
                                    {formatCurrency(project[`${selectedMonth}_cost`] || 0)}
                                    </td>
                                    {(userRole === 'admin' || userRole === 'superadmin') && (
                                    <td className="px-6 py-4 whitespace-nowrap no-print">
                                        {editingProject === project.project_name ? (
                                        <button
                                            className="px-2 py-1 bg-green-600 text-white rounded"
                                            onClick={async e => {
                                            e.stopPropagation();
                                            await saveProjectMeta(project.project_name);
                                            setEditingProject(null);
                                            }}
                                        >
                                            Save
                                        </button>
                                        ) : (
                                        <button
                                            className="px-2 py-1 bg-blue-600 text-white rounded"
                                            onClick={e => {
                                            e.stopPropagation();
                                            setEditingProject(project.project_name);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        )}
                                    </td>
                                    )}
                                </tr>
                                {(isPrinting || expandedProjects[project.project_name]) && (
                                    <tr>
                                    <td colSpan={(userRole === 'admin' || userRole === 'superadmin') ? 8 : 7}>
                                        <div className="p-4 bg-slate-100 text-sm">
                                        <div className="px-8">
                                            <h4 className="font-semibold text-gray-700 mb-2 text-base">Service Breakdown:</h4>
                                            <ServiceBreakdownView
                                            services={project.service_breakdown}
                                            selectedMonth={selectedMonth}
                                            isPrinting={isPrinting}
                                            />
                                        </div>
                                        </div>
                                    </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                                <td colSpan="6" className="px-6 py-4 text-right text-gray-800 text-lg">Grand Total</td>
                                <td className="px-6 py-4 text-green-800 font-extrabold text-lg">{formatCurrency(grandTotalToDisplay)}</td>
                                {(userRole === 'admin' || userRole === 'superadmin') && <td className="no-print"></td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Select Projects to Export</h3>
                        <button onClick={() => setIsExportModalOpen(false)}><X size={24}/></button>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <span className="font-semibold">Export by:</span>
                        <div className="flex justify-center bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => {setExportBy('projectName'); setSelectedForExport([]); setExportSearchTerm('');}} className={`px-3 py-1 text-sm font-semibold rounded-md ${exportBy === 'projectName' ? 'bg-white shadow' : 'text-gray-600'}`}>Project Name</button>
                            <button onClick={() => {setExportBy('projectCode'); setSelectedForExport([]); setExportSearchTerm('');}} className={`px-3 py-1 text-sm font-semibold rounded-md ${exportBy === 'projectCode' ? 'bg-white shadow' : 'text-gray-600'}`}>Project Code</button>
                        </div>
                    </div>
                    <div className="border rounded-lg p-2 mb-4">
                        <input
                            type="text"
                            value={exportSearchTerm}
                            onChange={(e) => setExportSearchTerm(e.target.value)}
                            placeholder={`Search by ${exportBy === 'projectName' ? 'name' : 'code'}...`}
                            className="p-2 border-b border-gray-300 w-full mb-2"
                        />
                        <div className="max-h-48 overflow-y-auto">
                            {exportableItems.length > 0 && (
                                <label className="flex items-center p-2 hover:bg-gray-100 rounded-md font-bold border-b sticky top-0 bg-white cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        ref={selectAllRef}
                                        onChange={handleSelectAll}
                                        className="mr-3 h-4 w-4"
                                    />
                                    Select All
                                </label>
                            )}
                            {exportableItems.map(item => (
                                <label key={item} className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer">
                                    <input type="checkbox" checked={selectedForExport.includes(item)} onChange={() => handleExportSelection(item)} className="mr-3 h-4 w-4"/>
                                    {item}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setIsExportModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button onClick={handleExportCSV} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Export CSV</button>
                        <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Export PDF</button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
};
export default ProjectsView;

