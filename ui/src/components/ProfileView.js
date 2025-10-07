import React, { useState, useContext, useEffect } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { User, KeyRound, Mail, Save, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Notification = ({ message, type }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50';
    const textColor = isSuccess ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';
    const Icon = isSuccess ? CheckCircle : AlertCircle;

    return (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${bgColor} ${textColor}`}>
            <Icon size={20} />
            <span>{message}</span>
        </div>
    );
};

const ProfileView = () => {
    const { token } = useContext(GlobalStateContext);
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });

    // In a real app, you would fetch the user's current email
    // For now, we'll just allow them to set it.

    useEffect(() => {
        if (notification.message) {
            const timer = setTimeout(() => setNotification({ message: '', type: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNotification({ message: '', type: '' });

        if (newPassword && newPassword !== confirmPassword) {
            setNotification({ message: 'New passwords do not match.', type: 'error' });
            return;
        }

        const payload = {};
        if (email) payload.email = email;
        if (newPassword) {
            payload.new_password = newPassword;
            payload.current_password = currentPassword;
        }

        if (Object.keys(payload).length === 0) {
            setNotification({ message: 'No changes to save.', type: 'info' });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            setNotification({ message: 'Profile updated successfully!', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

        } catch (error) {
            setNotification({ message: error.message || 'Failed to update profile.', type: 'error' });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <User className="mr-3" /> My Profile
            </h1>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter new email address" className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                        </div>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-6 space-y-6">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Change Password</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Current Password
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Required to change password" className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep unchanged" className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                            </div>
                        </div>
                    </div>
                    
                    {notification.message && <Notification message={notification.message} type={notification.type} />}

                    <button type="submit" className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        <Save size={18} />
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};
export default ProfileView;