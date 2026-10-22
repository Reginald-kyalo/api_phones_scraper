import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { BRAND } from '../../../lib/brand';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in form. Errors sit under the field they are about. A rejected
 * password and a failed request are different messages (design audit §13):
 * a network outage is never described as a wrong password. "Remember me"
 * went: the previous control changed nothing about the session.
 */
export function LoginForm({ redirect = '/' }: { redirect?: string }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Signed in');
      navigate(redirect);
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      setErrors({
        form: status === 401 || status === 403
          ? 'Email or password is incorrect.'
          : 'We couldn’t sign you in. Try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-card border border-border rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="loginEmail">Email address</Label>
          <Input
            id="loginEmail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'loginEmail-error' : undefined}
            className="mt-2"
          />
          {errors.email && <p id="loginEmail-error" className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="loginPassword">Password</Label>
          <div className="relative mt-2">
            <Input
              id="loginPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'loginPassword-error' : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="loginPassword-error" className="mt-1 text-xs text-destructive">{errors.password}</p>}
        </div>

        {errors.form && (
          <p role="alert" className="text-sm text-destructive">{errors.form}</p>
        )}

        <div className="flex items-center justify-end">
          {/* No reset flow exists; the honest link is to a person. */}
          <a href={`mailto:${BRAND.supportEmail}?subject=Help%20signing%20in`} className="text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
            Get help signing in
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}
