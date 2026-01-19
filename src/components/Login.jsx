/**
 * Login Component
 * User authentication form using Supabase Auth
 * P3 Enterprise Design System
 */

import React, { useState } from 'react';
import { LogIn, Lock, AlertCircle, Mail, UserPlus, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: email.split('@')[0],
              role: 'user',
              departments: [],
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setSuccess('Account created! You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        await login(email, password);
      }
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please confirm your email before logging in');
      } else if (err.message?.includes('User already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-p3-midnight rounded-lg mb-4">
            <span className="text-white font-bold text-lg">P3</span>
          </div>
          <h1 className="text-xl font-semibold text-p3-midnight dark:text-white mb-1">
            Workforce Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-enterprise-md p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-md flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-warning">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-success/5 border border-success/20 rounded-md flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success">{success}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter your email"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter your password'}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  minLength={isSignUp ? 6 : undefined}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                }}
                className="ml-1.5 text-p3-electric hover:text-primary-600 font-medium transition-colors"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Enterprise HR Cost Management System
        </p>
      </div>
    </div>
  );
};

export default Login;
