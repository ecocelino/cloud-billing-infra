import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpReportsView from '../components/gcp/GcpReportsView';
// import AwsReportsView from '../components/aws/AwsReportsView'; // For the future

const ReportsPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpReportsView />;
        case 'AWS':
            return <div>AWS Reports Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default ReportsPage;