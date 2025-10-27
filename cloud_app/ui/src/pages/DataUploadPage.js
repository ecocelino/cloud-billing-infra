import React, { useContext } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import GcpDataUploadView from '../components/gcp/GcpDataUploadView';
// import AwsDataUploadView from '../components/aws/AwsDataUploadView';

const DataUploadPage = () => {
    const { selectedPlatform } = useContext(GlobalStateContext);

    switch (selectedPlatform) {
        case 'GCP':
            return <GcpDataUploadView />;
        case 'AWS':
            // In the future, you will return <AwsDataUploadView /> here
            return <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg"><h2 className="text-2xl font-bold">AWS Data Upload</h2><p className="text-gray-500 mt-2">Coming soon...</p></div>;
        default:
            return <div>Error: No platform selected.</div>;
    }
};

export default DataUploadPage;