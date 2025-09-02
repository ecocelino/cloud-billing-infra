import React from 'react';
import { Cloud, Server, Database, Container } from 'lucide-react';

export const formatCurrency = (number) => {
    if (typeof number !== 'number') { number = 0; }
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export const getIcon = (type) => {
    const icons = { 'EC2': <Server className="text-blue-500" />, 'S3': <Cloud className="text-indigo-500" />, 'RDS': <Database className="text-green-500" />, 'Container': <Container className="text-purple-500" />, 'Compute Engine': <Server className="text-orange-500" />, 'Cloud Storage': <Cloud className="text-blue-500" /> };
    return icons[type] || <Cloud className="text-gray-500" />;
};