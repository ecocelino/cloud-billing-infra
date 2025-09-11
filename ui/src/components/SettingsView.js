import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { UserPlus, Trash2, Edit, Eye, EyeOff, CheckCircle, AlertCircle, Search } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// A dedicated Notification component for consistent feedback
const Notification = ({ message, type }) => {
    if (!message) return null;

    const baseClasses = 'fixed top-5 right-5 p-4 rounded-lg shadow-lg flex items-center gap-3 transition-opacity duration-300 z-50';
    const typeClasses = {
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
    };
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <Icon size={20} />
            <span>{message}</span>
        </div>
    );
};


const SettingsView = () => {
    const { token, userRole: currentUserRole } = useContext(GlobalStateContext);
    
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [editPassword, setEditPassword] = useState('');
    
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [projectSearchTerm, setProjectSearchTerm] = useState('');

    useEffect(() => {
        if (notification.message) {
            const timer = setTimeout(() => {
                setNotification({ message: '', type: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                setUsers(await response.json());
            } else {
                setNotification({ message: 'Failed to fetch users.', type: 'error' });
            }
        } catch (err) {
            setNotification({ message: 'An error occurred while fetching users.', type: 'error' });
        }
    }, [token]);

    const fetchProjects = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/projects/meta/all`, {
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                const metaData = await response.json();
                const projectList = Object.entries(metaData).map(([name, meta]) => ({
                    id: meta.id,
                    name: name,
                    code: meta.projectCode || 'N/A'
                }));
                setProjects(projectList);
            } else {
                setNotification({ message: 'Failed to fetch projects for assignment.', type: 'error' });
            }
        } catch(err) {
            setNotification({ message: 'An error occurred fetching projects.', type: 'error' });
        }
    }, [token]);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            await Promise.all([fetchUsers(), fetchProjects()]);
            setIsLoading(false);
        }
        fetchAllData();
    }, [fetchUsers, fetchProjects]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) {
            setNotification({ message: 'Username and password are required.', type: 'error' });
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(newUser)
            });
            const result = await response.json();
            if (response.ok) {
                setNotification({ message: 'User created successfully!', type: 'success' });
                setNewUser({ username: '', password: '', role: 'user' });
                fetchUsers();
            } else {
                setNotification({ message: result.error || 'Failed to create user.', type: 'error' });
            }
        } catch (err) {
            setNotification({ message: 'An error occurred while creating the user.', type: 'error' });
        }
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { 'x-access-token': token }
            });
            if (response.ok) {
                setNotification({ message: 'User deleted successfully.', type: 'success' });
                fetchUsers();
            } else {
                const result = await response.json();
                setNotification({ message: result.error || 'Failed to delete user.', type: 'error' });
            }
        } catch (err) {
            setNotification({ message: 'An error occurred while deleting the user.', type: 'error' });
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditPassword('');
        setProjectSearchTerm('');
        setShowEditPassword(false);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        const payload = { 
            role: editingUser.role,
            assigned_project_ids: editingUser.role === 'user' ? (editingUser.assigned_projects || []).map(p => p.id) : []
        };
        if (editPassword) payload.password = editPassword;

        try {
            const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setNotification({ message: 'User updated successfully!', type: 'success' });
                setIsEditModalOpen(false);
                // --- FIX: Re-fetch both users and projects to get the latest assignment data ---
                await Promise.all([fetchUsers(), fetchProjects()]);
                // --- END FIX ---
            } else {
                const result = await response.json();
                setNotification({ message: result.error || 'Failed to update user.', type: 'error' });
            }
        } catch (err) {
            setNotification({ message: 'An error occurred while updating user.', type: 'error' });
        }
    };

    const filteredProjects = useMemo(() => {
        if (!projectSearchTerm) return projects;
        return projects.filter(p => 
            (p.name || '').toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
            (p.code || '').toLowerCase().includes(projectSearchTerm.toLowerCase())
        );
    }, [projects, projectSearchTerm]);

    if (isLoading) return <div className="text-center p-10 font-semibold text-gray-500">Loading Settings...</div>;

    return (
        <div className="space-y-6 printable-content">
            <Notification message={notification.message} type={notification.type} />

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center"><UserPlus className="mr-2" />Add New User</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={newUser.username} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" autoComplete="username"/>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type={showNewPassword ? 'text' : 'password'} name="password" value={newUser.password} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" autoComplete="new-password"/>
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500">
                           {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select name="role" value={newUser.role} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                        </select>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Create User</button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Manage Users</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Projects</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">No users found. Add a new user above.</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.assigned_projects?.length || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={currentUserRole === 'admin' && user.role === 'superadmin'}><Edit size={18} /></button>
                                            <button onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-900 ml-4 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={currentUserRole === 'admin' && user.role === 'superadmin'}><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
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
                                <select value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" disabled={currentUserRole === 'admin' && editingUser.role === 'superadmin'}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700">New Password (optional)</label>
                                <input type={showEditPassword ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep unchanged" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" autoComplete="new-password"/>
                                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500">
                                   {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            
                            {editingUser.role === 'user' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Projects</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input type="text" placeholder="Search projects..." value={projectSearchTerm} onChange={e => setProjectSearchTerm(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-md"/>
                                    </div>
                                    <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                                        {filteredProjects.map(project => {
                                            const isAssigned = (editingUser.assigned_projects || []).some(p => p.id === project.id);
                                            return (
                                                <label key={project.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAssigned}
                                                        onChange={() => {
                                                            const currentAssigned = editingUser.assigned_projects || [];
                                                            const newAssigned = isAssigned
                                                                ? currentAssigned.filter(p => p.id !== project.id)
                                                                : [...currentAssigned, { id: project.id, project_name: project.name }];
                                                            setEditingUser({ ...editingUser, assigned_projects: newAssigned });
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="ml-3 text-sm text-gray-700">
                                                        {project.name} <span className="text-xs text-gray-500">({project.code})</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-2">Delete User</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete the user <span className="font-bold">{userToDelete.username}</span>? This action cannot be undone.</p>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button type="button" onClick={handleDeleteUser} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Delete User</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;

