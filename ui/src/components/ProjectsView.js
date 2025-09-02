import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const years = [2023, 2024, 2025, 2026, 2027];

const ProjectsView = ({ yearlyData = [], initialYear, envFilter }) => {
  const [editingProject, setEditingProject] = useState(null);
  const [projectMeta, setProjectMeta] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  useEffect(() => {
    const fetchMeta = async () => {
        try {
            const metaResponse = await fetch(`${API_BASE_URL}/projects/meta/all`);
            if (metaResponse.ok) {
                setProjectMeta(await metaResponse.json());
            }
        } catch (err) {
            console.error("Failed to fetch project metadata", err);
        }
    };
    fetchMeta();
  }, [yearlyData]);

  const saveProjectMeta = async (projectName) => {
    const meta = projectMeta[projectName] || {};
    try {
      await fetch(`${API_BASE_URL}/projects/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          project_code: meta.projectCode || '',
          environment: meta.environment || '',
          owner: meta.owner || '',
          team: meta.team || ''
        })
      });
    } catch (err) {
      console.error("Failed to save project metadata", err);
    }
  };

  const filteredProjectData = useMemo(() => {
    let dataForYear = yearlyData.filter(p => p.billing_year === selectedYear);
    
    let filtered = dataForYear;
    if (envFilter !== 'all') {
        const envLower = envFilter === 'prod' ? 'production' : 'non-production';
        filtered = filtered.filter(p => (projectMeta[p.project_name]?.environment || '').toLowerCase() === envLower);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
        return filtered.filter(project => {
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
    return filtered;
  }, [yearlyData, searchTerm, envFilter, projectMeta, selectedYear]);
  
  const grandTotal = useMemo(() => {
    return filteredProjectData.reduce((sum, project) => {
        const monthCost = project[`${selectedMonth}_cost`] || 0;
        return sum + monthCost;
    }, 0);
  }, [filteredProjectData, selectedMonth]);

  const toggleProject = (projectName) => { setExpandedProjects(prev => ({ ...prev, [projectName]: !prev[projectName] })); };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Projects Overview</h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
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
          placeholder="Search..."
          className="p-2 border border-gray-300 rounded-lg flex-grow"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost ({selectedMonth.toUpperCase()})</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjectData.map((project) => (
                <React.Fragment key={project.project_name}>
                  <tr onClick={() => toggleProject(project.project_name)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-4">{expandedProjects[project.project_name] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{project.project_name}</td>
                    {['projectCode', 'environment', 'owner', 'team'].map(field => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap">
                          {editingProject === project.project_name ? (
                            <input type="text" value={projectMeta[project.project_name]?.[field] || ''} onClick={e => e.stopPropagation()} onChange={e => setProjectMeta(meta => ({ ...meta, [project.project_name]: { ...meta[project.project_name], [field]: e.target.value } }))} placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace('Code', ' Code')} className="p-1 border border-gray-300 rounded w-24"/>
                          ) : (
                            <span>{projectMeta[project.project_name]?.[field] || ''}</span>
                          )}
                        </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{formatCurrency(project[`${selectedMonth}_cost`] || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {editingProject === project.project_name ? ( <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={async e => { e.stopPropagation(); await saveProjectMeta(project.project_name); setEditingProject(null); }}>Save</button> ) : ( <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={e => { e.stopPropagation(); setEditingProject(project.project_name); }}>Edit</button> )}
                    </td>
                  </tr>
                  {expandedProjects[project.project_name] && (
                    <tr>
                      <td colSpan="8" className="p-4 bg-slate-50">
                        <div className="px-8">
                            <h4 className="font-semibold text-gray-700 mb-2">Service Breakdown:</h4>
                            <ul className="list-disc pl-5 space-y-2">
                                {project.service_breakdown
                                .filter(service => service.billing_month === selectedMonth && parseFloat(service.cost || 0) > 0)
                                .sort((a, b) => b.cost - a.cost)
                                .map((service, idx) => (
                                    <li key={`${service.service_description}-${idx}`} className="flex justify-between items-center">
                                        <div>
                                            <span className="font-medium text-gray-800">{service.service_description || service.type || 'Unknown Service'}</span>
                                            {service.sku_description && <span className="ml-2 text-sm text-gray-500">SKU: {service.sku_description}</span>}
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
              ))}
            <tr className="bg-gray-100 font-bold">
              <td colSpan="6" className="px-6 py-4 text-right text-gray-800">Grand Total</td>
              <td className="px-6 py-4 text-green-800 font-extrabold">{formatCurrency(grandTotal)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ProjectsView;