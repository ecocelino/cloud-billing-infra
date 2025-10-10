import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpBillingView from '../components/gcp/GcpBillingView';
// import AwsBillingView from '../components/aws/AwsBillingView'; // For the future

const BillingPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpBillingView />;
        case 'AWS':
            return <div>AWS Billing Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default BillingPage;