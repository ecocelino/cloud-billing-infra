import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { Server, Database, Cpu, Trash2, PlusCircle, AlertCircle, CheckCircle, Download, Loader2, RefreshCw, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ReadOnlyField = ({ value, className = '' }) => (<span className={`text-gray-800 ${className}`}>{value}</span>);

const EditableField = ({ initialValue, onDebouncedChange, type = 'text', className = '' }) => {
    const [value, setValue] = useState(initialValue);
    useEffect(() => { setValue(initialValue); }, [initialValue]);
    useEffect(() => {
        const handler = setTimeout(() => {
            if (value !== initialValue) { onDebouncedChange(value); }
        }, 400);
        return () => { clearTimeout(handler); };
    }, [value, initialValue, onDebouncedChange]);
    return ( <input type={type} value={value} onChange={(e) => setValue(e.target.value)} className={`w-full bg-transparent border-b-2 border-transparent focus:outline-none focus:border-blue-500 transition-all p-1 -m-1 rounded-md ${className}`} /> );
};

const PricingCard = ({ tier, onTierChange, onRemoveService, onAddService, exchangeRateInfo, isEditable }) => {
    if (!tier) return null;

    const handleServiceChange = useCallback((serviceIndex, field, value) => {
        const updatedServices = tier.services.map((service, index) => {
            if (index === serviceIndex) {
                return { ...service, [field]: value };
            }
            return service;
        });
        onTierChange({ ...tier, services: updatedServices });
    }, [tier, onTierChange]);

    const monthlyTotalUSD = useMemo(() => 
        tier.services.reduce((acc, service) => acc + (parseFloat(service.price) || 0), 0),
        [tier.services]
    );
    const monthlyTotalPHP = monthlyTotalUSD * (exchangeRateInfo?.rate || 0);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col h-full border border-gray-200 printable-content">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{tier.title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-t-lg">
                        <tr>
                            <th scope="col" className="px-4 py-3">Service</th>
                            <th scope="col" className="px-4 py-3">Instance</th>
                            <th scope="col" className="px-4 py-3">Specs</th>
                            <th scope="col" className="px-4 py-3 text-right">Price (USD)</th>
                            {isEditable && <th scope="col" className="px-4 py-3 text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tier.services.map((service, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {isEditable ? <EditableField initialValue={service.service_name} onDebouncedChange={(v) => handleServiceChange(index, 'service_name', v)} /> : <ReadOnlyField value={service.service_name} />}
                                </td>
                                <td className="px-4 py-3">{isEditable ? <EditableField initialValue={service.instance} onDebouncedChange={(v) => handleServiceChange(index, 'instance', v)} /> : <ReadOnlyField value={service.instance} />}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2"><Cpu size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField initialValue={service.specs_vcpu || ''} onDebouncedChange={(v) => handleServiceChange(index, 'specs_vcpu', v)} /> : <ReadOnlyField value={service.specs_vcpu} />}</div>
                                    <div className="flex items-center gap-2"><Server size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField initialValue={service.specs_memory || ''} onDebouncedChange={(v) => handleServiceChange(index, 'specs_memory', v)} /> : <ReadOnlyField value={service.specs_memory} />}</div>
                                    <div className="flex items-center gap-2"><Database size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField initialValue={service.storage || ''} onDebouncedChange={(v) => handleServiceChange(index, 'storage', v)} /> : <ReadOnlyField value={service.storage} />}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    <div className="flex items-center justify-end"><span>$</span>{isEditable ? <EditableField type="number" initialValue={service.price} onDebouncedChange={(v) => handleServiceChange(index, 'price', v)} className="text-right" /> : <ReadOnlyField value={parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-right w-full" />}</div>
                                </td>
                                {isEditable && (<td className="px-4 py-3 text-center"><button onClick={() => onRemoveService(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={18} /></button></td>)}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {isEditable && (<tr><td colSpan="5" className="px-4 py-2"><button onClick={onAddService} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold py-1 px-2 rounded-md hover:bg-blue-50 transition-colors"><PlusCircle size={16} /> Add Service</button></td></tr>)}
                        <tr className="font-bold text-gray-800 bg-gray-100">
                            <td colSpan={3} className="px-4 py-3 text-right text-lg">Monthly Total (USD)</td>
                            <td className="px-4 py-3 text-right text-lg">${monthlyTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            {isEditable && <td></td>}
                        </tr>
                        <tr className="font-semibold text-gray-600 bg-gray-50">
                            <td colSpan={3} className="px-4 py-3 text-right">
                                <div>Monthly Total (PHP)</div>
                                {exchangeRateInfo ? (
                                    <div className="text-xs font-normal text-gray-500">Rate: ₱{exchangeRateInfo.rate.toFixed(4)} as of {exchangeRateInfo.last_updated}</div>
                                ) : (
                                    <div className="text-xs font-normal text-red-500">Rate not available</div>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {exchangeRateInfo ? `₱${monthlyTotalPHP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                            </td>
                            {isEditable && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500 italic">
                *Note: Pricing is based on the Google Cloud Pricing Calculator and is an estimate. Actual costs may vary.
            </div>
        </div>
    );
};

const PricingView = () => {
    const { token, userRole } = useContext(GlobalStateContext);
    const { tier: initialTier } = useParams();

    const [pricingData, setPricingData] = useState(null);
    const [originalData, setOriginalData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
    const [activeTier, setActiveTier] = useState(initialTier || 'basic');
    const [isUpdatingRate, setIsUpdatingRate] = useState(false);
    const [updateStatus, setUpdateStatus] = useState({ message: '', type: 'idle' });
    const [manualRate, setManualRate] = useState('');
    const [isSavingManualRate, setIsSavingManualRate] = useState(false);
    const [manualRateStatus, setManualRateStatus] = useState({ message: '', type: 'idle' });

    const isEditable = userRole === 'admin' || userRole === 'superadmin';

    useEffect(() => { 
        if (initialTier) { setActiveTier(initialTier); } 
    }, [initialTier]);

    const fetchPricingData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/pricing/gcp`, { headers: { 'x-access-token': token } });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch pricing data.');
            }
            const data = await response.json();
            setPricingData(data);
            setOriginalData(JSON.parse(JSON.stringify(data)));
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPricingData();
    }, [fetchPricingData]);

    const handleUpdateRate = async () => {
        setIsUpdatingRate(true);
        setUpdateStatus({ message: 'Fetching latest rate...', type: 'loading' });
        try {
            const response = await fetch(`${API_BASE_URL}/exchange-rate/update`, {
                method: 'POST',
                headers: { 'x-access-token': token }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setUpdateStatus({ message: result.message, type: 'success' });
            await fetchPricingData();
        } catch (err) {
            setUpdateStatus({ message: err.message, type: 'error' });
        } finally {
            setIsUpdatingRate(false);
             setTimeout(() => setUpdateStatus({ message: '', type: 'idle' }), 5000);
        }
    };

    const handleManualRateSave = async () => {
        const rateValue = parseFloat(manualRate);
        if (!rateValue || rateValue <= 0) {
            setManualRateStatus({ message: 'Please enter a valid, positive number.', type: 'error' });
            setTimeout(() => setManualRateStatus({ message: '', type: 'idle' }), 3000);
            return;
        }

        setIsSavingManualRate(true);
        setManualRateStatus({ message: 'Saving...', type: 'loading' });

        try {
            const response = await fetch(`${API_BASE_URL}/exchange-rate/manual-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify({ rate: rateValue }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save manual rate.');

            setManualRateStatus({ message: result.message, type: 'success' });
            setManualRate('');
            await fetchPricingData();
        } catch (err) {
            setManualRateStatus({ message: err.message, type: 'error' });
        } finally {
            setIsSavingManualRate(false);
            setTimeout(() => setManualRateStatus({ message: '', type: 'idle' }), 5000);
        }
    };
    
    const handleTierChange = useCallback((tierKey, updatedTier) => {
        setPricingData(currentData => {
            const monthlyTotalUSD = updatedTier.services.reduce((acc, service) => acc + (parseFloat(service.price) || 0), 0);
            const finalTier = { ...updatedTier, total: monthlyTotalUSD };
            return { ...currentData, [tierKey]: finalTier };
        });
    }, []);

    const handleAddService = useCallback((tierKey) => {
        if (!pricingData) return;
        const newService = { service_name: "New Service", instance: "", specs_vcpu: "", specs_memory: "", storage: "", price: "0" };
        const updatedTier = { ...pricingData[tierKey], services: [...pricingData[tierKey].services, newService] };
        handleTierChange(tierKey, updatedTier);
    }, [pricingData, handleTierChange]);

    const handleRemoveService = useCallback((tierKey, serviceIndex) => {
        if (!pricingData) return;
        const updatedServices = pricingData[tierKey].services.filter((_, index) => index !== serviceIndex);
        const updatedTier = { ...pricingData[tierKey], services: updatedServices };
        handleTierChange(tierKey, updatedTier);
    }, [pricingData, handleTierChange]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus({ message: '', type: '' });
        try {
            const response = await fetch(`${API_BASE_URL}/pricing/gcp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(pricingData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save data.');
            }
            setSaveStatus({ message: 'Pricing data saved successfully!', type: 'success' });
            setOriginalData(JSON.parse(JSON.stringify(pricingData)));
        } catch (err) {
            setSaveStatus({ message: err.message, type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus({ message: '', type: '' }), 5000);
        }
    };
    
    const handleCancel = () => {
        setPricingData(JSON.parse(JSON.stringify(originalData)));
    };

    const handleExportPDF = () => {
        if (!pricingData || !activeTier) return;
        const tierData = pricingData[activeTier];
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(tierData.title, 14, 22);
        doc.setFontSize(10);
        
        if (pricingData.exchange_rate_info && pricingData.exchange_rate_info.last_updated) {
            const utcDate = new Date(pricingData.exchange_rate_info.last_updated);
            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Manila',
                hour12: true
            };
            const manilaTimestamp = new Intl.DateTimeFormat('en-US', options).format(utcDate) + " PHT";
            const exchangeInfo = `Exchange Rate: ₱${pricingData.exchange_rate_info.rate.toFixed(4)} as of ${manilaTimestamp}`;
            doc.text(exchangeInfo, 14, 30);
        }

        const tableColumn = ["Service", "Instance", "Specs", "Price (USD)"];
        const tableRows = [];
        
        tierData.services.forEach(service => {
            const specs = [ service.specs_vcpu || '', service.specs_memory || '', service.storage || '' ].filter(Boolean).join('\n');
            const serviceData = [ 
                service.service_name, 
                service.instance, 
                specs, 
                { content: `$${(parseFloat(service.price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } } 
            ];
            tableRows.push(serviceData);
        });
        
        const monthlyTotalUSD = tierData.total || 0;
        const monthlyTotalPHP = monthlyTotalUSD * (pricingData.exchange_rate_info?.rate || 0);
        
        tableRows.push([{ content: '', colSpan: 4, styles: { minCellHeight: 4 } }]);
        tableRows.push([ { content: 'Monthly Total (USD):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 } }, { content: `$${monthlyTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 } } ]);
        tableRows.push([ { content: 'Monthly Total (PHP):', colSpan: 3, styles: { halign: 'right', fontSize: 11, textColor: [100, 100, 100] } }, { content: `₱${monthlyTotalPHP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'left', fontSize: 11, textColor: [100, 100, 100] } } ]);
        
        let finalY = 0;

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [34, 49, 63] },
            styles: { valign: 'middle' },
            didParseCell: function(data) {
                const isTotalRow = data.row.index >= tierData.services.length;
                if (isTotalRow) {
                    data.cell.styles.fillColor = '#f8f9fa';
                    data.cell.styles.lineWidth = 0;
                }
            },
            didDrawPage: function (data) {
                finalY = data.cursor.y;
            }
        });

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text( '*Note: Pricing is based on the Google Cloud Pricing Calculator and is an estimate. Actual costs may vary.', 14, finalY + 10 );
        doc.save(`${tierData.title.replace(/\s+/g, '-')}.pdf`);
    };

    const hasChanges = useMemo(() => 
        JSON.stringify(pricingData) !== JSON.stringify(originalData), 
        [pricingData, originalData]
    );

    if (isLoading) return <div className="text-center p-10 font-semibold text-gray-500">Loading Pricing Data...</div>;
    if (error) return <div className="text-center p-10 font-semibold text-red-500 bg-red-100 rounded-lg">{error}</div>;

    const renderTier = (tierKey) => (
        <PricingCard
            key={tierKey}
            tier={pricingData[tierKey]}
            onTierChange={(t) => handleTierChange(tierKey, t)}
            onRemoveService={(i) => handleRemoveService(tierKey, i)}
            onAddService={() => handleAddService(tierKey)}
            exchangeRateInfo={pricingData.exchange_rate_info}
            isEditable={isEditable}
        />
    );

    return (
        <div className="space-y-6 printable-content">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">GCP Infrastructure Pricing</h2>
                    <p className="mt-1 text-gray-600">Details for the selected pricing tier.</p>
                </div>
                 <div className="flex items-start flex-wrap gap-4">
                    {isEditable && (
                        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2">
                                <button onClick={handleUpdateRate} disabled={isUpdatingRate} className="flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-600 transition-all disabled:bg-gray-400">
                                    {isUpdatingRate ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                    <span>Auto-Update Rate</span>
                                </button>
                                {updateStatus.type !== 'idle' && (
                                    <span className={`text-sm ${updateStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{updateStatus.message}</span>
                                )}
                            </div>
                            <div className="text-xs text-center text-gray-500">or</div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                    <input
                                        type="number"
                                        value={manualRate}
                                        onChange={(e) => setManualRate(e.target.value)}
                                        placeholder="Manual Rate"
                                        className="pl-6 pr-2 py-2 border rounded-lg w-36 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        disabled={isSavingManualRate}
                                    />
                                </div>
                                <button
                                    onClick={handleManualRateSave}
                                    disabled={isSavingManualRate || !manualRate}
                                    className="flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-all disabled:bg-gray-400"
                                >
                                    {isSavingManualRate ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    <span>Save Rate</span>
                                </button>
                            </div>
                            {manualRateStatus.type !== 'idle' && (
                                <div className={`text-sm text-center mt-1 ${manualRateStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{manualRateStatus.message}</div>
                            )}
                        </div>
                    )}

                    <div className="flex-grow flex items-center justify-start md:justify-end gap-4">
                         {isEditable && (
                            <div className="flex items-center gap-x-4">
                                <button onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                                    {isSaving ? <><Loader2 size={20} className="animate-spin mr-2"/>Saving...</> : 'Save Changes'}
                                </button>
                                {hasChanges && !isSaving && (
                                    <button onClick={handleCancel} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-300 transition-all">
                                        Cancel
                                    </button>
                                )}
                                {saveStatus.message && (
                                    <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {saveStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                        {saveStatus.message}
                                    </div>
                                )}
                            </div>
                         )}
                        <button onClick={handleExportPDF} className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-black transition-all flex items-center justify-center gap-2">
                           <Download size={18} />
                           <span>Export PDF</span>
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="mt-6">
                {pricingData && activeTier && pricingData[activeTier] ? (
                    renderTier(activeTier)
                ) : (
                    <div className="text-center p-10 font-semibold text-gray-500 bg-white rounded-lg shadow-md">
                        <p>Please select a pricing tier from the sidebar to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingView;