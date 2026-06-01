import React, { useState } from 'react';
import { EyeClosed, Eye } from 'iconoir-react';

interface LoginModalProps {
  onLogin: (email: string, pass: string) => Promise<boolean>;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const success = await onLogin(email, password);
    
    if (!success) {
      setError('Invalid credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-coinbase-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[420px] rounded-xl shadow-soft border border-coinbase-hairline animate-in zoom-in-95 duration-200">
        <div className="p-8 lg:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-coinbase-primary rounded-full flex items-center justify-center mb-4 text-white font-bold text-sm">
              WG
            </div>
            <h2 className="text-[24px] font-semibold text-coinbase-ink tracking-[-0.01em]">Admin Access</h2>
            <p className="text-coinbase-muted text-[15px] mt-1 font-medium">Werkudara Group Authentication</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Email Address</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@werkudara.com"
                className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none transition-all text-[16px] placeholder:text-coinbase-muted text-coinbase-ink focus:border-coinbase-primary focus:ring-2 focus:ring-coinbase-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none transition-all text-[16px] placeholder:text-coinbase-muted text-coinbase-ink pr-10 focus:border-coinbase-primary focus:ring-2 focus:ring-coinbase-primary/10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-coinbase-muted hover:text-coinbase-ink transition-colors rounded-md"
                >
                  {showPassword ? (
                    <EyeClosed className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-ship-red text-[14px] font-medium mt-1 text-center bg-[#fff5f5] p-2 rounded-md border border-[#ffd6d6]">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 bg-coinbase-primary text-white font-semibold text-[16px] rounded-pill hover:bg-coinbase-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-soft"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
            
            <div className="text-center mt-6">
              <button 
                type="button"
                onClick={onClose}
                className="text-[15px] font-semibold text-coinbase-muted hover:text-coinbase-ink transition-colors p-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;