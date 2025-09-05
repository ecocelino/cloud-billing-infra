import React from 'react';
import { Cloud, Server, Database, Container } from 'lucide-react';

export const normalizeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  let s = String(value).trim();
  if (s === '' || s.toLowerCase() === 'nan') return 0;

  // Handle parentheses-style negatives: (123.45)
  const isParenNegative = s.startsWith('(') && s.endsWith(')');
  if (isParenNegative) s = '-' + s.slice(1, -1);

  // Remove currency symbol and commas and spaces
  s = s.replace(/\$/g, '').replace(/,/g, '').replace(/\s+/g, '');

  // Remove any leading '+' sign
  s = s.replace(/^\+/, '');

  const num = parseFloat(s);
  return Number.isNaN(num) ? 0 : num;
};

export const formatCurrency = (value) => {
    // Use normalizeNumber to handle different formats before formatting as currency
    const number = normalizeNumber(value);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(number);
};

export const getIcon = (type) => {
    const icons = {
        'Compute Engine': <Server className="text-orange-500" />,
        'Cloud Storage': <Cloud className="text-blue-500" />,
        'BigQuery': <Database className="text-green-500" />,
        'Places API': <Container className="text-purple-500" />
    };
    return icons[type] || <Cloud className="text-gray-500" />;
};

