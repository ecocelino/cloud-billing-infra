import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpPricingView from '../components/gcp/GcpPricingView';
// import AwsPricingView from '../components/aws/AwsPricingView'; // For the future

const PricingPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpPricingView />;
        case 'AWS':
            return <div>AWS Pricing Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default PricingPage;