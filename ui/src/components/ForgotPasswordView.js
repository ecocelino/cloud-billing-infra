import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Cloud, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const ForgotPasswordView = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ message: '', type: 'idle' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: 'Sending request...', type: 'loading' });
        
        // This is where you will call your backend later
        // For now, we'll simulate a success response
        setTimeout(() => {
            setStatus({ 
                message: 'If an account with that email exists, a password reset link has been sent.', 
                type: 'success' 
            });
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full mb-4">
                        <Cloud size={40} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Forgot Password</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your email to receive a reset link.</p>
                </div>

                {status.type === 'success' ? (
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/40 rounded-lg">
                        <CheckCircle className="text-green-500 mx-auto mb-2" size={40}/>
                        <p className="text-green-800 dark:text-green-200">{status.message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" placeholder="you@company.com" />
                            </div>
                        </div>
                        {status.type === 'error' && (
                            <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16}/>{status.message}</div>
                        )}
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-sm">
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center gap-2">
                        <ArrowLeft size={16}/> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordView;