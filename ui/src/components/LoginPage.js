import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    await onLogin(username, password, rememberMe);
    // A small delay to prevent UI flashing on very fast auth responses
    setTimeout(() => setIsLoading(false), 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-transparent dark:border-gray-700">
        
        <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full mb-4">
                <Cloud size={40} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Cloud Cost System</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
                placeholder="Enter your username" 
                required 
              />
          </div>
          
          <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-1">Password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
                placeholder="Enter your password" 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
          </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"/>
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Remember me</label>
                </div>
                <div className="text-sm">
                    <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                        Forgot your password?
                    </Link>
                </div>
            </div>
          
            {error && (
                <div className="bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm p-3 rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle size={18} /><span>{error}</span>
                </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-700 dark:disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <><Loader2 size={20} className="animate-spin" /><span>Signing In...</span></> : 'Log In'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;