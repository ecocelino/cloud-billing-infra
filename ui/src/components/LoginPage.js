import React, { useState } from 'react';
import { Cloud } from 'lucide-react';

const LoginPage = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onLogin(username, password); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Cloud Costing System</h1></div>
        <div className="flex flex-col items-center mb-6"><Cloud size={60} className="text-blue-600 mb-4" /><h2 className="text-2xl font-bold text-gray-900">Sign In</h2><p className="text-gray-500 mt-2">Access your dashboard</p></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label className="block text-sm font-medium text-gray-700 text-left">Username</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-lg p-3" placeholder="Enter your username" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 text-left">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-lg p-3" placeholder="Enter your password" required /></div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700">Log In</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;