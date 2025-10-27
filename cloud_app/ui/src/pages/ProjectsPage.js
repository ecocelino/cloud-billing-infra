import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpProjectsView from '../components/gcp/GcpProjectsView';
// import AwsProjectsView from '../components/aws/AwsProjectsView'; // For the future

const ProjectsPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpProjectsView />;
        case 'AWS':
            return <div>AWS Projects Page - Coming Soon...</div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default ProjectsPage;