import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpProjectDetailView from '../components/gcp/GcpProjectDetailView';
// import AwsProjectDetailView from '../components/aws/AwsProjectDetailView'; // For the future

const ProjectDetailPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpProjectDetailView />;
        case 'AWS':
            return <div>AWS Project Detail Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default ProjectDetailPage;