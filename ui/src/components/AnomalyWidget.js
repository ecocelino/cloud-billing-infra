import React, { useState, useEffect, useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { AlertTriangle, Check, X } from 'lucide-react';
import { formatCurrency } from '../utils';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const AnomalyWidget = () => {
    const { token } = useContext(GlobalStateContext);
    const [anomalies, setAnomalies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnomalies = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/anomalies/unread`, {
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                setAnomalies(await response.json());
            }
        } catch (error) {
            console.error("Failed to fetch anomalies:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnomalies();
    }, [token]);

    const handleAcknowledge = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/anomalies/${id}/acknowledge`, {
                method: 'PUT',
                headers: { 'x-access-token': token }
            });
            setAnomalies(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to acknowledge anomaly:", error);
        }
    };

    if (isLoading || anomalies.length === 0) {
        return null; // Don't show the widget if there's nothing to show
    }

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-r-lg shadow-lg">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                </div>
                <div className="ml-3 w-full">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Cost Anomaly Alerts</h3>
                    <div className="mt-2 space-y-3">
                        {anomalies.map(anom => {
                            const percentage = anom.average_cost > 0 ? ((anom.anomalous_cost - anom.average_cost) / anom.average_cost) * 100 : 100;
                            return (
                                <div key={anom.id} className="flex justify-between items-center text-sm text-yellow-700 dark:text-yellow-300">
                                    <div>
                                        <span className="font-bold">{anom.project_name}</span> spent <span className="font-bold">{formatCurrency(anom.anomalous_cost)}</span> in {anom.month}
                                        <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">(+{Math.round(percentage)}% vs avg)</span>
                                    </div>
                                    <button onClick={() => handleAcknowledge(anom.id)} className="p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800">
                                        <Check size={18} title="Acknowledge" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnomalyWidget;