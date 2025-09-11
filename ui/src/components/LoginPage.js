import React, { useState, useEffect } from 'react';
import { Cloud, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

const LoginPage = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // --- SUGGESTION 1: State to track loading status ---
  const [isLoading, setIsLoading] = useState(false);
  // --- SUGGESTION 2: State for password visibility ---
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };
  
  // Clear error message when the user starts typing again
  useEffect(() => {
      // This is a good practice but requires `error` and `setError` to be managed by the context.
      // For now, we assume the parent component handles clearing the error.
  }, [username, password]);

  return (
    // --- SUGGESTION 3: Enhanced background ---
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        
        <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
                <Cloud size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Cloud Cost System</h1>
            <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                // --- SUGGESTION 3: Enhanced focus state ---
                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
                placeholder="Enter your username" 
                required 
              />
          </div>
          
          <div className="relative">
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">Password</label>
              <input 
                // --- SUGGESTION 2: Dynamic input type ---
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
                placeholder="Enter your password" 
                required 
              />
              {/* --- SUGGESTION 2: Password visibility toggle button --- */}
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
          </div>
          
          {/* --- SUGGESTION 4: Enhanced error display --- */}
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center justify-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            // --- SUGGESTION 1: Dynamic button state ---
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Signing In...</span>
                </>
            ) : (
                'Log In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
