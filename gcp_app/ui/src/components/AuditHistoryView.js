import React, { useState, useEffect, useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { History } from 'lucide-react';

const AuditHistoryView = () => {
    const { token } = useContext(GlobalStateContext);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!token) return;
            try {
                const response = await fetch('/api/audit-logs', { headers: { 'x-access-token': token } });
                if (response.ok) {
                    setLogs(await response.json());
                }
            } catch (err) { console.error("Failed to fetch logs:", err); } 
            finally { setIsLoading(false); }
        };
        fetchLogs();
    }, [token]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <History className="mr-3" /> Audit Log
            </h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <table className="min-w-full">
                    <thead>{/* ... Table Headers: Timestamp, User, Action, Details ... */}</thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                <td>{log.username}</td>
                                <td>{log.action}</td>
                                <td><pre>{JSON.stringify(log.details, null, 2)}</pre></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditHistoryView;