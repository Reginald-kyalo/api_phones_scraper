import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';
import { BRAND } from '../../../lib/brand';

export function LoginForm({ redirect = '/' }: { redirect?: string }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || 'We couldn’t sign you in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="loginEmail">Email</Label>
          <Input
            id="loginEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="loginPassword">Password</Label>
          <div className="relative mt-2">
            <Input
              id="loginPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              aria-label="Remember me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label htmlFor="rememberMe" className="text-sm cursor-pointer">
              Remember me
            </label>
          </div>
          <a href={`mailto:${BRAND.supportEmail}?subject=Reset%20my%20password`} className="text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
            Forgot your password?
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}
