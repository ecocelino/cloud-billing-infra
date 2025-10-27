import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import { FileCog, Save, Loader2, PlusCircle, ChevronDown, Trash2, CheckCircle, XCircle } from 'lucide-react';

const RuleEditor = ({ rule, onConfigChange, isReadOnly = false }) => {
    const handleFieldChange = (field, value) => {
        onConfigChange({ ...rule.config, [field]: value });
    };

    const handleListChange = (field, index, value) => {
        const newList = [...rule.config[field]];
        newList[index] = value;
        onConfigChange({ ...rule.config, [field]: newList });
    };

    const addListItem = (field) => {
        const newList = [...(rule.config[field] || []), ''];
        onConfigChange({ ...rule.config, [field]: newList });
    };

    const removeListItem = (field, index) => {
        const newList = rule.config[field].filter((_, i) => i !== index);
        onConfigChange({ ...rule.config, [field]: newList });
    };

    const renderTextField = (field, label, placeholder = '') => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input 
                type="text" 
                value={rule.config[field] || ''} 
                onChange={(e) => handleFieldChange(field, e.target.value)} 
                className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={placeholder}
                disabled={isReadOnly}
            />
        </div>
    );

    const renderListField = (field, label) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="space-y-2 mt-1">
                {(rule.config[field] || []).map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={item} 
                            onChange={(e) => handleListChange(field, index, e.target.value)} 
                            className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isReadOnly}
                        />
                        <button type="button" onClick={() => removeListItem(field, index)} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isReadOnly}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => addListItem(field)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={isReadOnly}>
                    <PlusCircle size={16} /> Add Item
                </button>
            </div>
        </div>
    );

    switch (rule.rule_type) {
        case 'RENAME_PROJECT':
            return (
                <div className="space-y-4">
                    {renderTextField('source_project_name', 'Source Project Name', 'e.g., legacy-project-name')}
                    {renderTextField('new_project_name', 'New Project Name', 'e.g., new-project-name-v2')}
                </div>
            );
        case 'MOVE_SERVICE':
            return (
                <div className="space-y-4">
                    {renderTextField('from_project', 'From Project')}
                    {renderTextField('to_project', 'To Project')}
                    {renderListField('services', 'Services to Move')}
                </div>
            );
        case 'DISTRIBUTE_COST':
            return (
                <div className="space-y-4">
                    {renderTextField('source_project', 'Source Project')}
                    {renderListField('target_project_names', 'Target Project Names')}
                </div>
            );
        default:
            return <p className="text-sm text-gray-500 dark:text-gray-400">Select a rule type to see its configuration options.</p>;
    }
};

const GcpBusinessRulesView = () => {
    const { token, userRole } = useContext(GlobalStateContext);
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const isReadOnly = userRole === 'admin';
    
    const [ruleTemplates] = useState({
        RENAME_PROJECT: { source_project_name: "", new_project_name: "" },
        MOVE_SERVICE: { from_project: "", to_project: "", services: [""] },
        DISTRIBUTE_COST: { source_project: "", target_project_names: [""] },
    });
    
    const [newRule, setNewRule] = useState({
        name: '', description: '', rule_type: 'RENAME_PROJECT',
        start_date: null, end_date: null, config: ruleTemplates.RENAME_PROJECT
    });
    const [expandedRuleId, setExpandedRuleId] = useState(null);

    const formatDateForInput = (isoDate) => {
        if (!isoDate) return '';
        return isoDate.split('T')[0];
    };

    const fetchRules = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/business-rules`, { headers: { 'x-access-token': token } });
            if (!response.ok) throw new Error('Failed to fetch rules.');
            const data = await response.json();
            const formattedData = data.map(rule => ({
                ...rule,
                config: typeof rule.config === 'string' ? JSON.parse(rule.config) : (rule.config || ruleTemplates[rule.rule_type] || {})
            }));
            setRules(formattedData);
        } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    }, [token, ruleTemplates]);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const handleRuleChange = (ruleId, field, value) => {
        setRules(currentRules => currentRules.map(rule => rule.id === ruleId ? { ...rule, [field]: value } : rule));
    };

    const handleSave = async (ruleId) => {
        if (isReadOnly) return;
        const ruleToSave = rules.find(r => r.id === ruleId);
        if (!ruleToSave) return;
        setSaveStatus({ ...saveStatus, [ruleId]: 'saving' });
        try {
            const response = await fetch(`/api/business-rules/${ruleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({
                    is_active: ruleToSave.is_active,
                    config: ruleToSave.config,
                    start_date: ruleToSave.start_date || null,
                    end_date: ruleToSave.end_date || null,
                    platform: 'GCP'
                })
            });
            if (!response.ok) throw new Error('Failed to save.');
            setSaveStatus({ ...saveStatus, [ruleId]: 'success' });
        } catch (err) { setSaveStatus({ ...saveStatus, [ruleId]: 'error' }); } 
        finally { setTimeout(() => setSaveStatus(s => ({...s, [ruleId]: null})), 3000); }
    };

    const handleCreateRule = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        try {
            const response = await fetch(`/api/business-rules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({
                    ...newRule,
                    start_date: newRule.start_date || null,
                    end_date: newRule.end_date || null,
                    platform: 'GCP'
                })
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to create rule.');
            }
            setIsModalOpen(false);
            setNewRule({ name: '', description: '', rule_type: 'RENAME_PROJECT', start_date: null, end_date: null, config: ruleTemplates.RENAME_PROJECT });
            fetchRules();
        } catch (err) { alert(`Error: ${err.message}`); }
    };
    
    const handleNewRuleChange = (field, value) => {
        setNewRule(prev => {
            const updatedRule = { ...prev, [field]: value };
            if (field === 'rule_type') {
                updatedRule.config = ruleTemplates[value] || {};
            }
            return updatedRule;
        });
    };
    
    const handleToggleExpand = (ruleId) => {
        setExpandedRuleId(currentId => (currentId === ruleId ? null : ruleId));
    };

    if (isLoading) return <div className="text-center p-10 font-semibold text-gray-500 dark:text-gray-400">Loading Business Rules...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><FileCog className="mr-3 text-gray-700 dark:text-gray-300" />GCP Business Rules</h1>
                <button onClick={() => setIsModalOpen(true)} disabled={isReadOnly} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    <PlusCircle size={18} />Add New Rule
                </button>
            </div>
            {isReadOnly && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-500 rounded-r-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">You are in read-only mode. Only a SuperAdmin can create or edit business rules.</p>
                </div>
            )}
            <p className="text-gray-600 dark:text-gray-400">Configure rules to transform GCP billing data. Click on a rule to expand and edit its details.</p>
            <div className="space-y-2">
                {rules.map(rule => {
                    const isExpanded = expandedRuleId === rule.id;
                    return (
                        <div key={rule.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden">
                            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => handleToggleExpand(rule.id)}>
                                <div className="flex items-center gap-4">
                                    <ChevronDown size={20} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{rule.name}</h3>
                                        <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">{rule.rule_type}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                   <div className="flex items-center">
                                        <span className={`text-sm font-medium mr-2 ${rule.is_active ? 'text-green-600' : 'text-gray-500'}`}>{rule.is_active ? 'Active' : 'Inactive'}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={rule.is_active} onChange={(e) => handleRuleChange(rule.id, 'is_active', e.target.checked)} className="sr-only peer" disabled={isReadOnly} />
                                            <div className={`w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}></div>
                                        </label>
                                   </div>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="p-6 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-black/20 space-y-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-4">{rule.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date (Optional)</label>
                                            <input type="date" value={formatDateForInput(rule.start_date)} onChange={(e) => handleRuleChange(rule.id, 'start_date', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isReadOnly}/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date (Optional)</label>
                                            <input type="date" value={formatDateForInput(rule.end_date)} onChange={(e) => handleRuleChange(rule.id, 'end_date', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isReadOnly}/>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">A rule is active on the start and end dates. Leave blank for an indefinite duration.</p>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Configuration</label>
                                        <RuleEditor rule={rule} onConfigChange={(newConfig) => handleRuleChange(rule.id, 'config', newConfig)} isReadOnly={isReadOnly} />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={() => handleSave(rule.id)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed w-32 justify-center" disabled={isReadOnly}>
                                            {saveStatus[rule.id] === 'saving' && <Loader2 className="animate-spin" size={18}/>}
                                            {saveStatus[rule.id] === 'success' && <CheckCircle size={18}/>}
                                            {saveStatus[rule.id] === 'error' && <XCircle size={18}/>}
                                            {!saveStatus[rule.id] && <Save size={18}/>}
                                            <span>{saveStatus[rule.id] === 'saving' ? 'Saving' : saveStatus[rule.id] === 'success' ? 'Saved' : saveStatus[rule.id] === 'error' ? 'Error' : 'Save'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
                        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Business Rule</h3>
                        <form onSubmit={handleCreateRule} className="space-y-4">
                            <fieldset>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name</label>
                                    <input type="text" value={newRule.name} onChange={(e) => handleNewRuleChange('name', e.target.value)} required className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                                 <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                    <input type="text" value={newRule.description} onChange={(e) => handleNewRuleChange('description', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Type</label>
                                        <select value={newRule.rule_type} onChange={(e) => handleNewRuleChange('rule_type', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
                                            <option value="RENAME_PROJECT">Rename Project</option>
                                            <option value="MOVE_SERVICE">Move Service</option>
                                            <option value="DISTRIBUTE_COST">Distribute Cost</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date (Optional)</label>
                                        <input type="date" value={formatDateForInput(newRule.start_date)} onChange={(e) => handleNewRuleChange('start_date', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200"/>
                                    </div>
                                    <div className="md:col-span-1">
                                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date (Optional)</label>
                                        <input type="date" value={formatDateForInput(newRule.end_date)} onChange={(e) => handleNewRuleChange('end_date', e.target.value)} className="mt-1 w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-gray-200"/>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Configuration</label>
                                    <RuleEditor 
                                        rule={newRule} 
                                        onConfigChange={(newConfig) => handleNewRuleChange('config', newConfig)}
                                    />
                                </div>
                                <div className="flex justify-end gap-4 pt-4 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Create Rule</button>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GcpBusinessRulesView;