import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpDashboard from '../components/gcp/GcpDashboard';
//import AwsDashboard from '../components/aws/AwsDashboard';

const DashboardPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpDashboard />;
        case 'AWS':
            return <div>AWS Dashboard Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default DashboardPage;