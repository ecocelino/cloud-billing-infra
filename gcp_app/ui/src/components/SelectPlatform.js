import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { Cloud } from 'lucide-react';

const SelectPlatform = () => {
    const { setSelectedPlatform } = useContext(GlobalStateContext);
    const navigate = useNavigate();

    const handleSelect = (platform) => {
        setSelectedPlatform(platform);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center mb-12">
                <Cloud size={60} className="text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Select a Platform</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Choose a cloud provider to manage.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                {/* GCP Card */}
                <div 
                    onClick={() => handleSelect('GCP')} 
                    className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg w-80 text-center cursor-pointer transition-transform transform hover:-translate-y-2 border dark:border-gray-700 flex flex-col items-center justify-between"
                >
                    {/* 🔹 UPDATED: Using an <img> tag to load the official logo */}
                    <img 
                        src="/images/gcp-logo.png" 
                        alt="Google Cloud Platform Logo" 
                        className="h-16 mb-4" 
                    />
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">GCP</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Google Cloud Platform</p>
                    </div>
                </div>

                {/* AWS Card */}
                <div 
                    onClick={() => handleSelect('AWS')} 
                    className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg w-80 text-center cursor-pointer transition-transform transform hover:-translate-y-2 border dark:border-gray-700 flex flex-col items-center justify-between"
                >
                    {/* 🔹 UPDATED: Using an <img> tag to load the official logo */}
                    <img 
                        src="/images/aws-logo.png" 
                        alt="Amazon Web Services Logo" 
                        className="h-16 mb-4 dark:invert"
                    />
                     <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">AWS</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Amazon Web Services</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectPlatform;