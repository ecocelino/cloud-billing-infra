import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { GlobalStateContext } from '../context/GlobalStateContext';
import { UserPlus, Trash2, Edit, Eye, EyeOff, CheckCircle, AlertCircle, Search, Users, Palette, Sun, Moon, Laptop } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Notification = ({ message, type }) => {
    if (!message) return null;

    const baseClasses = 'fixed top-5 right-5 p-4 rounded-lg shadow-lg flex items-center gap-3 transition-opacity duration-300 z-50';
    const typeClasses = {
        success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <Icon size={20} />
            <span>{message}</span>
        </div>
    );
};

export const UsersView = () => {
    const { token, userRole: currentUserRole } = useContext(GlobalStateContext);
    
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user', accessible_platforms: ['GCP'] });
    
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
            const response = await fetch(`/api/users`, {
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
            const response = await fetch(`/api/projects/meta/all`, {
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

    const handlePlatformChange = (platform, isChecked) => {
        const currentPlatforms = newUser.accessible_platforms || [];
        let newPlatforms;
        if (isChecked) {
            newPlatforms = [...currentPlatforms, platform];
        } else {
            newPlatforms = currentPlatforms.filter(p => p !== platform);
        }
        setNewUser(prev => ({ ...prev, accessible_platforms: newPlatforms }));
    };

    const handleEditPlatformChange = (platform, isChecked) => {
        const currentPlatforms = editingUser.accessible_platforms || [];
        let newPlatforms;
        if (isChecked) {
            newPlatforms = [...currentPlatforms, platform];
        } else {
            newPlatforms = currentPlatforms.filter(p => p !== platform);
        }
        setEditingUser(prev => ({ ...prev, accessible_platforms: newPlatforms }));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password || !newUser.email) {
            setNotification({ message: 'Username, email, and password are required.', type: 'error' });
            return;
        }
        try {
            const response = await fetch(`/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(newUser)
            });
            const result = await response.json();
            if (response.ok) {
                setNotification({ message: 'User created successfully!', type: 'success' });
                setNewUser({ username: '', email: '', password: '', role: 'user', accessible_platforms: ['GCP'] });
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
            const response = await fetch(`/api/users/${userToDelete.id}`, {
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
            email: editingUser.email,
            role: editingUser.role,
            accessible_platforms: editingUser.accessible_platforms,
            assigned_project_ids: editingUser.role === 'user' ? (editingUser.assigned_projects || []).map(p => p.id) : []
        };
        if (editPassword) payload.password = editPassword;

        try {
            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setNotification({ message: 'User updated successfully!', type: 'success' });
                setIsEditModalOpen(false);
                await fetchUsers();
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

    if (isLoading) return <div className="text-center p-10 font-semibold text-gray-500 dark:text-gray-400">Loading User Data...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center"><Users className="mr-3 text-gray-700 dark:text-gray-300" />User Management</h1>
            <Notification message={notification.message} type={notification.type} />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center"><UserPlus className="mr-2" />Add New User</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" name="username" value={newUser.username} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200" autoComplete="username"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input type="email" name="email" value={newUser.email} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200" autoComplete="email"/>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input type={showNewPassword ? 'text' : 'password'} name="password" value={newUser.password} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200" autoComplete="new-password"/>
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500 dark:text-gray-400">
                           {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                        <select name="role" value={newUser.role} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Access</label>
                        <div className="mt-2 flex gap-4">
                            <label className="flex items-center">
                                <input type="checkbox" checked={newUser.accessible_platforms.includes('GCP')} onChange={(e) => handlePlatformChange('GCP', e.target.checked)} className="h-4 w-4 rounded" />
                                <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">GCP</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" checked={newUser.accessible_platforms.includes('AWS')} onChange={(e) => handlePlatformChange('AWS', e.target.checked)} className="h-4 w-4 rounded" />
                                <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">AWS</span>
                            </label>
                        </div>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">Create User</button>
                </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Manage Existing Users</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Platforms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Assigned Projects</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id} className="dark:text-gray-200">
                                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{user.accessible_platforms?.join(', ') || 'None'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.assigned_projects?.length || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={currentUserRole === 'admin' && user.role === 'superadmin'}><Edit size={18} /></button>
                                        <button onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-900 ml-4 dark:text-red-400 dark:hover:text-red-300 disabled:text-gray-400 disabled:cursor-not-allowed" disabled={currentUserRole === 'admin' && user.role === 'superadmin'}><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit User: {editingUser.username}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <input type="email" value={editingUser.email || ''} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                <select value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200" disabled={currentUserRole === 'admin' && editingUser.role === 'superadmin'}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    {currentUserRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password (optional)</label>
                                <input type={showEditPassword ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep unchanged" className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200" autoComplete="new-password"/>
                                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500 dark:text-gray-400">
                                   {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Access</label>
                                <div className="mt-2 flex gap-4">
                                    <label className="flex items-center">
                                        <input type="checkbox" checked={editingUser.accessible_platforms?.includes('GCP')} onChange={(e) => handleEditPlatformChange('GCP', e.target.checked)} className="h-4 w-4 rounded" />
                                        <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">GCP</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="checkbox" checked={editingUser.accessible_platforms?.includes('AWS')} onChange={(e) => handleEditPlatformChange('AWS', e.target.checked)} className="h-4 w-4 rounded" />
                                        <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">AWS</span>
                                    </label>
                                </div>
                            </div>
                            {editingUser.role === 'user' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Projects</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input type="text" placeholder="Search projects..." value={projectSearchTerm} onChange={e => setProjectSearchTerm(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"/>
                                    </div>
                                    <div className="mt-2 border dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                                        {filteredProjects.map(project => {
                                            const isAssigned = (editingUser.assigned_projects || []).some(p => p.id === project.id);
                                            return (
                                                <label key={project.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                                    <input type="checkbox" checked={isAssigned} onChange={() => { const currentAssigned = editingUser.assigned_projects || []; const newAssigned = isAssigned ? currentAssigned.filter(p => p.id !== project.id) : [...currentAssigned, { id: project.id, project_name: project.name }]; setEditingUser({ ...editingUser, assigned_projects: newAssigned }); }} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{project.name} <span className="text-xs text-gray-500 dark:text-gray-400">({project.code})</span></span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isDeleteModalOpen && userToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Delete User</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete the user <span className="font-bold">{userToDelete.username}</span>? This action cannot be undone.</p>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                            <button type="button" onClick={handleDeleteUser} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Delete User</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const CustomizeView = () => {
    const { theme, setTheme } = useContext(GlobalStateContext);

    const handleAccentChange = (colorClass) => {
        const root = document.documentElement;
        root.classList.forEach(className => {
            if (className.startsWith('theme-')) {
                root.classList.remove(className);
            }
        });
        root.classList.add(colorClass);
    };

    const ThemeButton = ({ mode, text, icon: Icon }) => (
        <button
            onClick={() => setTheme(mode)}
            className={`flex flex-col items-center justify-center w-full p-6 border-2 rounded-lg transition-all duration-200 ${
                theme === mode 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 shadow-md' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        >
            <Icon size={28} className="mb-2 text-gray-600 dark:text-gray-300" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{text}</span>
        </button>
    );

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <Palette className="mr-3 text-gray-700 dark:text-gray-300" />Customize Appearance
            </h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Theme</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Choose how the application looks. "System" will match your current OS setting.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ThemeButton mode="light" text="Light" icon={Sun} />
                    <ThemeButton mode="dark" text="Dark" icon={Moon} />
                    <ThemeButton mode="system" text="System" icon={Laptop} />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Accent Color</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Select a primary color for buttons, links, and active elements.</p>
                <div className="flex items-center gap-4">
                    <button onClick={() => handleAccentChange('theme-blue')} className="h-10 w-10 rounded-full bg-blue-600 ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-blue-600 focus:outline-none focus:ring-4"></button>
                    <button onClick={() => handleAccentChange('theme-indigo')} className="h-10 w-10 rounded-full bg-indigo-600 hover:ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-indigo-600 focus:outline-none focus:ring-4"></button>
                    <button onClick={() => handleAccentChange('theme-emerald')} className="h-10 w-10 rounded-full bg-emerald-600 hover:ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-emerald-600 focus:outline-none focus:ring-4"></button>
                    <button onClick={() => handleAccentChange('theme-rose')} className="h-10 w-10 rounded-full bg-rose-600 hover:ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-rose-600 focus:outline-none focus:ring-4"></button>
                </div>
                 <p className="text-xs text-gray-400 mt-4">Note: This is a simplified demo. A full implementation would use CSS variables.</p>
            </div>
        </div>
    );
};

export default UsersView;