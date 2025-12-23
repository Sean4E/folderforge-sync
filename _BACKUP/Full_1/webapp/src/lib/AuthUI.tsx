// ============================================================================
// FOLDERFORGE SYNC - AUTH UI COMPONENTS
// ============================================================================

import React, { useState } from 'react';
import {
  FolderTree,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from './auth';

// ============================================================================
// GLASS CARD COMPONENT
// ============================================================================

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

// ============================================================================
// INPUT COMPONENT
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

const Input = ({ icon, error, className = '', ...props }: InputProps) => (
  <div className="space-y-1">
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
          {icon}
        </div>
      )}
      <input
        className={`
          w-full bg-white/5 border border-white/10 rounded-xl
          ${icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5
          text-white placeholder-zinc-500
          focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50
          transition-all duration-200
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
    {error && (
      <p className="text-red-400 text-xs flex items-center gap-1">
        <AlertCircle size={12} /> {error}
      </p>
    )}
  </div>
);

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = ({
  variant = 'primary',
  loading,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    outline: 'bg-transparent border border-white/20 hover:bg-white/5 text-white',
  };

  return (
    <button
      className={`
        w-full py-3.5 rounded-xl font-medium
        flex items-center justify-center gap-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
  );
};

// ============================================================================
// SOCIAL AUTH BUTTONS
// ============================================================================

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

// ============================================================================
// AUTH PAGE COMPONENT
// ============================================================================

type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  onSuccess?: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp, signInWithGoogle, signInWithGithub, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onSuccess?.();
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        setSuccess('Check your email to confirm your account!');
      } else if (mode === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset email sent!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setError('');
    setLoading(true);

    try {
      const { error } = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithGithub();

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/25">
            <FolderTree size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FolderForge Sync</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {mode === 'login' && 'Welcome back! Sign in to continue.'}
            {mode === 'signup' && 'Create your account to get started.'}
            {mode === 'forgot-password' && 'Reset your password.'}
          </p>
        </div>

        <GlassCard className="p-6">
          {/* Mode tabs */}
          {mode !== 'forgot-password' && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${mode === 'login' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${mode === 'signup' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
              <Check size={16} />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                icon={<User size={18} />}
                required
              />
            )}

            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={18} />}
              required
            />

            {mode !== 'forgot-password' && (
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={18} />}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot-password'); setError(''); setSuccess(''); }}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" loading={loading} icon={<ArrowRight size={18} />}>
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot-password' && 'Send Reset Link'}
            </Button>
          </form>

          {mode === 'forgot-password' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="w-full mt-4 text-sm text-zinc-400 hover:text-zinc-300"
            >
              Back to sign in
            </button>
          )}

          {/* Social auth */}
          {mode !== 'forgot-password' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#18181B] text-zinc-400">or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialAuth('google')}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialAuth('github')}
                  disabled={loading}
                >
                  <GitHubIcon />
                  GitHub
                </Button>
              </div>
            </>
          )}
        </GlassCard>

        {/* Terms */}
        {mode === 'signup' && (
          <p className="text-center text-xs text-zinc-500 mt-4">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-emerald-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-emerald-400 hover:underline">Privacy Policy</a>
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROFILE MENU COMPONENT
// ============================================================================

interface ProfileMenuProps {
  onSignOut: () => void;
}

export function ProfileMenu({ onSignOut }: ProfileMenuProps) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
  };

  const initials = profile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium hover:ring-2 hover:ring-white/20 transition-all"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 z-50">
            <GlassCard className="p-2">
              <div className="px-3 py-2 border-b border-white/10 mb-2">
                <p className="text-white font-medium">{profile?.display_name}</p>
                <p className="text-zinc-400 text-sm truncate">{profile?.email}</p>
              </div>

              <button
                onClick={() => { /* TODO: Open settings */ setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5 rounded-lg flex items-center gap-2"
              >
                <User size={16} />
                Account Settings
              </button>

              <button
                onClick={handleSignOut}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
              >
                <ArrowRight size={16} className="rotate-180" />
                Sign Out
              </button>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

export default AuthPage;
