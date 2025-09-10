import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const SettingsView = ({ token, currentUserRole }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editPassword, setEditPassword] = useState('');

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                setUsers(await response.json());
            } else {
                setError('Failed to fetch users.');
            }
        } catch (err) {
            setError('An error occurred while fetching users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        if (!newUser.username || !newUser.password) {
            setError('Username and password are required.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token
                },
                body: JSON.stringify(newUser)
            });
            if (response.ok) {
                setNewUser({ username: '', password: '', role: 'user' });
                fetchUsers();
            } else {
                const result = await response.json();
                setError(result.error || 'Failed to create user.');
            }
        } catch (err) {
            setError('An error occurred while creating the user.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'x-access-token': token }
                });
                if (response.ok) {
                    fetchUsers();
                } else {
                    const result = await response.json();
                    setError(result.error || 'Failed to delete user.');
                }
            } catch (err) {
                setError('An error occurred while deleting the user.');
            }
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditPassword('');
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        const payload = { role: editingUser.role };
        if (editPassword) {
            payload.password = editPassword;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setIsEditModalOpen(false);
                fetchUsers();
            } else {
                const result = await response.json();
                alert(result.error || 'Failed to update user.');
            }
        } catch (err) {
            alert('An error occurred while updating user.');
        }
    };

    if (isLoading) return <div className="text-center p-4">Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center"><UserPlus className="mr-2" />Add New User</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={newUser.username} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" data-gramm="false" autoComplete="username"/>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        {/* FIX: Added autocomplete="new-password" */}
                        <input type="password" name="password" value={newUser.password} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" data-gramm="false" autoComplete="new-password"/>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select name="role" value={newUser.role} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                        </select>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Create User</button>
                </form>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Manage Users</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={currentUserRole === 'admin' && user.role === 'superadmin'}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-red-600 hover:text-red-900 ml-4 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={currentUserRole === 'admin' && user.role === 'superadmin'}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-4">Edit User: {editingUser.username}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                    disabled={currentUserRole === 'admin' && editingUser.role === 'superadmin'}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                                <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Leave blank to keep unchanged"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                    data-gramm="false"
                                    // FIX: Added autocomplete="new-password"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;