import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.ts';
import { Modal } from '../../components/common/Modal.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Truck, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessSignUp?: () => void;
  onSuccessSignIn?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccessSignUp, onSuccessSignIn }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUserData } = useAuth();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Supabase is not yet configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Please provide credentials to authenticate.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          // Profile trigger or manual profile insert
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim() || null,
            preferred_timezone: 'Asia/Kolkata',
          });
          await refreshUserData(data.user);
          onClose();
          if (onSuccessSignUp) {
            onSuccessSignUp();
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        await refreshUserData(data?.user);
        onClose();
        if (onSuccessSignIn) {
          onSuccessSignIn();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      id="auth-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={isSignUp ? 'Create DispatchDesk Account' : 'Sign in to DispatchDesk'}
      subtitle={
        isSignUp
          ? 'Join or establish a multi-tenant dispatch organization'
          : 'Access your fleet operations workspace'
      }
      maxWidth="md"
    >
      <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSignUp && (
          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
          <input
            type="email"
            required
            placeholder="dispatcher@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">Password *</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <div className="pt-2 text-center text-slate-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Need a new workspace?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
