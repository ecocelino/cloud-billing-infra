import React, { useState, useEffect, useCallback } from 'react';
import { Server, Database, Cpu, Trash2, PlusCircle, AlertCircle, CheckCircle, Download } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ReadOnlyField = ({ value, className = '' }) => (<span className={`text-gray-800 ${className}`}>{value}</span>);

const EditableField = ({ value, onChange, type = 'text', className = '' }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full bg-transparent border-b-2 border-transparent focus:outline-none focus:border-blue-500 transition-all p-1 -m-1 rounded-md ${className}`}
    />
);

const PricingCard = ({ tier, onTierChange, onRemoveService, onAddService, exchangeRateInfo, isEditable }) => {
    if (!tier) return null;

    const handleServiceChange = (serviceIndex, field, value) => {
        const updatedServices = [...tier.services];
        const targetService = { ...updatedServices[serviceIndex] };
        targetService[field] = value;
        updatedServices[serviceIndex] = targetService;
        onTierChange({ ...tier, services: updatedServices });
    };

    const monthlyTotalUSD = tier.services.reduce((acc, service) => acc + (parseFloat(service.price) || 0), 0);
    const monthlyTotalPHP = monthlyTotalUSD * (exchangeRateInfo?.rate || 0);

    useEffect(() => {
        if (isEditable && tier.total !== monthlyTotalUSD) {
            onTierChange({ ...tier, total: monthlyTotalUSD });
        }
    }, [monthlyTotalUSD, tier, onTierChange, isEditable]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col h-full border border-gray-200" id="pricing-card-content">
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
                                    {isEditable ? <EditableField value={service.service_name} onChange={(e) => handleServiceChange(index, 'service_name', e.target.value)} /> : <ReadOnlyField value={service.service_name} />}
                                </td>
                                <td className="px-4 py-3">{isEditable ? <EditableField value={service.instance} onChange={(e) => handleServiceChange(index, 'instance', e.target.value)} /> : <ReadOnlyField value={service.instance} />}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2"><Cpu size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField value={service.specs_vcpu || ''} onChange={(e) => handleServiceChange(index, 'specs_vcpu', e.target.value)} /> : <ReadOnlyField value={service.specs_vcpu} />}</div>
                                    <div className="flex items-center gap-2"><Server size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField value={service.specs_memory || ''} onChange={(e) => handleServiceChange(index, 'specs_memory', e.target.value)} /> : <ReadOnlyField value={service.specs_memory} />}</div>
                                    <div className="flex items-center gap-2"><Database size={14} className="text-gray-500 flex-shrink-0"/>{isEditable ? <EditableField value={service.storage || ''} onChange={(e) => handleServiceChange(index, 'storage', e.target.value)} /> : <ReadOnlyField value={service.storage} />}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    <div className="flex items-center justify-end"><span>$</span>{isEditable ? <EditableField type="number" value={service.price} onChange={(e) => handleServiceChange(index, 'price', e.target.value)} className="text-right" /> : <ReadOnlyField value={parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-right w-full" />}</div>
                                </td>
                                {isEditable && (<td className="px-4 py-3 text-center"><button onClick={() => onRemoveService(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"><Trash2 size={18} /></button></td>)}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        {isEditable && (<tr><td colSpan="5" className="px-4 py-2"><button onClick={onAddService} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold py-1 px-2 rounded-md hover:bg-blue-50 transition-colors"><PlusCircle size={16} /> Add Service</button></td></tr>)}
                        <tr className="font-bold text-gray-800 bg-gray-100">
                            <td colSpan={isEditable ? 4 : 3} className="px-4 py-3 text-right text-lg">Monthly Total (USD)</td>
                            <td className="px-4 py-3 text-right text-lg">${monthlyTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            {isEditable && <td></td>}
                        </tr>
                        <tr className="font-semibold text-gray-600 bg-gray-50">
                            <td colSpan={isEditable ? 4 : 3} className="px-4 py-3 text-right">
                                <div>Monthly Total (PHP)</div>
                                {exchangeRateInfo && (<div className="text-xs font-normal text-gray-500">Rate: ₱{exchangeRateInfo.rate.toFixed(4)} as of {exchangeRateInfo.last_updated}</div>)}
                            </td>
                            <td className="px-4 py-3 text-right">₱{monthlyTotalPHP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            {isEditable && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const PricingView = ({ token, userRole, initialTier }) => {
    const [pricingData, setPricingData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
    const [activeTier, setActiveTier] = useState(initialTier || 'basic');
    const [pdfScriptsLoaded, setPdfScriptsLoaded] = useState(false);

    const isEditable = userRole === 'admin' || userRole === 'superadmin';

    useEffect(() => {
        const loadScript = (src, onLoad) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = onLoad;
            document.body.appendChild(script);
            return script;
        };
    
        if (window.jspdf) {
            setPdfScriptsLoaded(true);
            return;
        }
    
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js', () => {
                setPdfScriptsLoaded(true);
            });
        });
    
        return () => {
            const scripts = document.querySelectorAll('script[src*="jspdf"]');
            scripts.forEach(s => s.remove());
        };
    }, []);
    

    useEffect(() => { if (initialTier) { setActiveTier(initialTier); } }, [initialTier]);

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
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchPricingData(); }, [fetchPricingData]);

    const handleTierChange = (tierKey, updatedTier) => {
        setPricingData(prevData => ({ ...prevData, [tierKey]: updatedTier }));
    };

    const handleAddService = (tierKey) => {
        const newService = { service_name: "New Service", instance: "", specs_vcpu: "", specs_memory: "", storage: "", price: 0 };
        const updatedTier = { ...pricingData[tierKey], services: [...pricingData[tierKey].services, newService] };
        handleTierChange(tierKey, updatedTier);
    };

    const handleRemoveService = (tierKey, serviceIndex) => {
        const updatedServices = pricingData[tierKey].services.filter((_, index) => index !== serviceIndex);
        const updatedTier = { ...pricingData[tierKey], services: updatedServices };
        handleTierChange(tierKey, updatedTier);
    };

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
        } catch (err) {
            setSaveStatus({ message: err.message, type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus({ message: '', type: '' }), 5000);
        }
    };

    const handleExportPDF = () => {
        if (!pricingData || !activeTier || !pdfScriptsLoaded) return;

        const tierData = pricingData[activeTier];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(tierData.title, 14, 22);

        doc.setFontSize(10);
        if (pricingData.exchange_rate_info) {
             const exchangeInfo = `Exchange Rate: ₱${pricingData.exchange_rate_info.rate.toFixed(4)} as of ${pricingData.exchange_rate_info.last_updated}`;
             doc.text(exchangeInfo, 14, 30);
        }

        const tableColumn = ["Service", "Instance", "Specs", "Price (USD)"];
        const tableRows = [];

        tierData.services.forEach(service => {
            const specs = [
                service.specs_vcpu || '',
                service.specs_memory || '',
                service.storage || ''
            ].filter(Boolean).join('\n');

            const serviceData = [
                service.service_name,
                service.instance,
                specs,
                { content: `$${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right' } }
            ];
            tableRows.push(serviceData);
        });

        // --- Start of Fix ---
        // Instead of a second table, add total rows to the main table body for perfect alignment.
        const monthlyTotalUSD = tierData.services.reduce((acc, service) => acc + (parseFloat(service.price) || 0), 0);
        const monthlyTotalPHP = monthlyTotalUSD * (pricingData.exchange_rate_info?.rate || 0);

        // Add a blank row for visual separation.
        tableRows.push([{ content: '', colSpan: 4, styles: { minCellHeight: 4 } }]);

        // Add Monthly Total (USD) row
        tableRows.push([
            {
                content: 'Monthly Total (USD):',
                colSpan: 3,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 }
            },
            {
                content: `$${monthlyTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 }
            }
        ]);

        // Add Monthly Total (PHP) row
        tableRows.push([
            {
                content: 'Monthly Total (PHP):',
                colSpan: 3,
                styles: { halign: 'right', fontSize: 11, textColor: [100, 100, 100] }
            },
            {
                content: `₱${monthlyTotalPHP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                styles: { halign: 'left', fontSize: 11, textColor: [100, 100, 100] }
            }
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [34, 49, 63] },
            styles: { valign: 'middle' },
            // This hook styles the total rows to distinguish them from the data rows.
            didParseCell: function(data) {
                const isTotalRow = data.row.index >= tierData.services.length;
                if (isTotalRow) {
                    data.cell.styles.fillColor = '#f8f9fa'; // A light grey background
                    // Remove cell borders for total rows to make them look like a clean footer
                    data.cell.styles.lineWidth = 0;
                }
            }
        });
        // --- End of Fix ---

        doc.save(`${tierData.title.replace(/\s+/g, '-')}.pdf`);
    };

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
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">GCP Infrastructure Pricing</h2>
                    <p className="mt-1 text-gray-600">Details for the selected pricing tier.</p>
                </div>
                 <div className="flex flex-col items-stretch gap-y-4 sm:flex-row sm:items-center sm:gap-x-4">
                    {isEditable && (
                        <div className="flex flex-col items-stretch gap-y-4 sm:flex-row-reverse sm:items-center sm:gap-x-4">
                             <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            {saveStatus.message && (
                                <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {saveStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    {saveStatus.message}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={handleExportPDF} disabled={!pdfScriptsLoaded} className="flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-all flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed">
                       {pdfScriptsLoaded ? (
                           <>
                            <Download size={18} />
                            <span>Export PDF</span>
                           </>
                       ) : (
                           <span>Loading PDF...</span>
                       )}
                    </button>
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

