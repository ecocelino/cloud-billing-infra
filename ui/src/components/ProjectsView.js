import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils.js'; // <-- UPDATED IMPORT

const API_BASE_URL = process.env.REACT_APP_API_URL;

const ProjectsView = ({ platformFilter, envFilter }) => {
  // Helper to persist project meta to backend
  const saveProjectMeta = async (projectName) => {
    const meta = projectMeta[projectName] || {};
    try {
      await fetch(`${API_BASE_URL}/projects/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          project_code: meta.projectCode || '',
          environment: meta.environment || ''
        })
      });
      // Refresh meta for this project after save
      const metaResponse = await fetch(`${API_BASE_URL}/projects/meta?project_name=${encodeURIComponent(projectName)}`);
      if (metaResponse.ok) {
        const updatedMeta = await metaResponse.json();
        setProjectMeta(prev => ({ ...prev, [projectName]: updatedMeta }));
      }
    } catch (err) {
      // Optionally handle error
    }
  };
  // State to track which project is being edited
  const [editingProject, setEditingProject] = useState(null);
  // State to hold manual edits for environment and project code per project
  const [projectMeta, setProjectMeta] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [billingData, setBillingData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('jul');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  // Sync year dropdown options with BillingView.js
  const years = [2023, 2024, 2025, 2026, 2027];
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/billing/services?platform=${platformFilter}&year=${selectedYear}&month=${selectedMonth}`);
        let data = await response.json();
        if(Array.isArray(data)){
          setBillingData(data);
          // Fetch project meta from backend so saved values persist
          const metaResponse = await fetch(`${API_BASE_URL}/projects/meta/all`);
          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            setProjectMeta(metaData);
          }
        } else { setBillingData([]); }
      } catch (err) { setBillingData([]); }
    };
    fetchBillingData();
  }, [platformFilter, selectedMonth, selectedYear]);

  // Helper to get simplified name for GCP only
  const getSimpleName = (name, platform) => {
    // Only replace underscores with hyphens for GCP, no custom renaming
    if (platform === 'GCP') {
      return name.replace(/_/g, '-');
    }
    return name;
  };

  // Removed dynamic years variable to avoid redeclaration and use static years array for dropdown

  const projectData = useMemo(() => {
    // Group by project and collect all service descriptions with their costs
    const projects = {};
    const transferMonth = 'jun';
    const transferYear = 2025;
    const renameMonth = 'may';
    const renameYear = 2025;
    billingData.forEach(item => {
      let projectName = getSimpleName(item.project_name, platformFilter);
      let cost = parseFloat(item.cost || 0);
      // Rename logic for '[Charges not specific to a project]' for May 2025 and below
      if (
        item.project_name === '[Charges not specific to a project]'
        && ((selectedYear < renameYear) || (selectedYear === renameYear && months.indexOf(selectedMonth) <= months.indexOf(renameMonth)))
      ) {
        projectName = 'Netenrich Resolution Intelligence Cloud';
      }
      // Transfer logic for '[Charges not specific to a project]' and Duet AI for June 2025 and above
      else if (
        item.project_name === '[Charges not specific to a project]'
        && ((selectedYear > transferYear) || (selectedYear === transferYear && months.indexOf(selectedMonth) >= months.indexOf(transferMonth)))
      ) {
        if ((item.service_description || '').toLowerCase().includes('duet ai')) {
          // Transfer Duet AI cost to ai-research-and-development
          projectName = 'ai-research-and-development';
        }
      }
      if (!projects[projectName]) {
        projects[projectName] = {
          name: projectName,
          totalCost: 0,
          serviceBreakdown: []
        };
      }
      projects[projectName].totalCost += cost;
      projects[projectName].serviceBreakdown.push({
        service_description: item['service_description'] || '',
        type: item['type'] || '',
        sku: item['sku_description'] || '',
        cost
      });
    });
    return Object.values(projects).sort((a, b) => b.totalCost - a.totalCost);
  }, [billingData, envFilter, platformFilter]);

  const filteredProjectData = useMemo(() => {
    // Environment dropdown logic
    let filtered = projectData;
    if (envFilter === 'prod') {
      filtered = filtered.filter(project => {
        const env = (projectMeta[project.name]?.environment || '').toLowerCase();
        return env === 'production' || env === 'prod';
      });
    } else if (envFilter === 'nonprod') {
      filtered = filtered.filter(project => {
        const env = (projectMeta[project.name]?.environment || '').toLowerCase();
        return env === 'non-production' || env === 'nonprod' || env === 'non production';
      });
    }
    if (!searchActive || !searchTerm.trim()) return filtered;
    const term = searchTerm.trim().toLowerCase();
    return filtered.filter(project => {
      const meta = projectMeta[project.name] || {};
      return (
        project.name.toLowerCase().includes(term) ||
        (meta.projectCode || '').toLowerCase().includes(term) ||
        (meta.environment || '').toLowerCase().includes(term)
      );
    });
  }, [projectData, searchTerm, searchActive, envFilter, projectMeta]);

  const toggleProject = (projectName) => { setExpandedProjects(prev => ({ ...prev, [projectName]: !prev[projectName] })); };

  // Add grand total calculation
  const grandTotal = useMemo(() => {
    return filteredProjectData.reduce((sum, project) => sum + project.totalCost, 0);
  }, [filteredProjectData]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Projects Billing Overview</h3>
      <div className="flex space-x-4 mb-4">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-gray-300 rounded-lg">
          {months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded-lg">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search project..."
          className="p-2 border border-gray-300 rounded-lg"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => setSearchActive(true)}
        >Search</button>
        <button
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg"
          onClick={() => { setSearchTerm(""); setSearchActive(false); }}
        >Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-8"></th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)} Cost</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjectData.filter(project => project.totalCost !== 0).map((project) => {
              // Auto environment logic
              let envValue = projectMeta[project.name]?.environment;
              if (!envValue || envValue === '') {
                const nameLower = project.name.toLowerCase();
                if (nameLower.includes('nonprod')) {
                  envValue = 'Non-Production';
                } else if (nameLower.includes('prod')) {
                  envValue = 'Production';
                } else {
                  envValue = '';
                }
              }
              return (
                <React.Fragment key={project.name}>
                  <tr onClick={() => toggleProject(project.name)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-4">{expandedProjects[project.name] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">{project.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.name ? (
                        <input
                          type="text"
                          value={projectMeta[project.name]?.projectCode || ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setProjectMeta(meta => ({ ...meta, [project.name]: { ...meta[project.name], projectCode: e.target.value } }))}
                          placeholder="Project Code"
                          className="p-1 border border-gray-300 rounded w-32"
                        />
                      ) : (
                        <span>{projectMeta[project.name]?.projectCode || ''}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.name ? (
                        <input
                          type="text"
                          value={projectMeta[project.name]?.environment || envValue}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setProjectMeta(meta => ({ ...meta, [project.name]: { ...meta[project.name], environment: e.target.value } }))}
                          placeholder="Environment"
                          className="p-1 border border-gray-300 rounded w-32"
                        />
                      ) : (
                        <span>{envValue}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{formatCurrency(project.totalCost)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.name ? (
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded"
                          onClick={async e => {
                            e.stopPropagation();
                            await saveProjectMeta(project.name);
                            setEditingProject(null);
                          }}
                        >Save</button>
                      ) : (
                        <button
                          className="px-2 py-1 bg-blue-600 text-white rounded"
                          onClick={e => { e.stopPropagation(); setEditingProject(project.name); }}
                        >Edit</button>
                      )}
                    </td>
                  </tr>
                  {expandedProjects[project.name] && (
                    <tr>
                      <td colSpan="6" className="p-4 bg-slate-50">
                        <div className="px-8">
                          <h4 className="font-semibold text-gray-700 mb-2">Service Breakdown:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {project.serviceBreakdown.filter(service => service.cost !== 0).sort((a, b) => b.cost - a.cost).map((service, idx) => (
                              <li key={idx} className="flex flex-col md:flex-row md:justify-between">
                                <div>
                                  <span className="font-medium">{service.service_description || service.type || service.sku || 'Other'}</span>
                                  {service.sku && <span className="ml-2 text-xs text-gray-500">SKU: {service.sku}</span>}
                                </div>
                                <span className="font-medium text-green-600">{formatCurrency(service.cost)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* Grand Total Row */}
            <tr className="bg-gray-100 font-bold">
              <td></td>
              <td className="px-6 py-4 text-right text-gray-800">Grand Total</td>
              <td></td>
              <td></td>
              <td className="px-6 py-4 text-green-800 font-extrabold">{formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectsView;