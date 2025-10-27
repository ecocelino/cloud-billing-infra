import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpBudgetsView from '../components/gcp/GcpBudgetsView';
// import AwsBudgetsView from '../components/aws/AwsBudgetsView'; // For the future

const BudgetsPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpBudgetsView />;
        case 'AWS':
            return <div>AWS Budgets Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default BudgetsPage;