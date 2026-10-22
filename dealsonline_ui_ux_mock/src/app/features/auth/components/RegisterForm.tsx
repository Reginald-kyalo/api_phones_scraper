import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The rule the client enforces today. Change the API's rule and this together. */
const MIN_PASSWORD = 6;

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'terms' | 'form', string>>;

/**
 * Create-account form. Each message sits under its field and names the rule
 * it applies. Terms and privacy are separate sentences: agreeing to the
 * terms is the consent; the privacy policy is information (design audit §13).
 */
export function RegisterForm({ redirect = '/' }: { redirect?: string }) {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter a password.';
    else if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (confirmPassword !== password) next.confirm = 'Passwords don’t match.';
    if (!agreeTerms) next.terms = 'Agree to the Terms of service to continue.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signup(email.trim(), password);
      toast.success('Account created');
      navigate(redirect);
    } catch {
      setErrors({ form: 'We couldn’t create your account. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const field = (id: string, error?: string) => ({
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-card border border-border rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="registerName">Name</Label>
          <Input id="registerName" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" {...field('registerName', errors.name)} />
          {errors.name && <p id="registerName-error" className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="registerEmail">Email address</Label>
          <Input id="registerEmail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" {...field('registerEmail', errors.email)} />
          {errors.email && <p id="registerEmail-error" className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="registerPassword">Password</Label>
          <div className="relative mt-2">
            <Input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              {...field('registerPassword', errors.password)}
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
          <p id="registerPassword-error" className={`mt-1 text-xs ${errors.password ? 'text-destructive' : 'text-muted-foreground'}`}>
            {errors.password ?? `Use at least ${MIN_PASSWORD} characters.`}
          </p>
        </div>

        <div>
          <Label htmlFor="registerConfirmPassword">Confirm password</Label>
          <Input
            id="registerConfirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-2"
            {...field('registerConfirmPassword', errors.confirm)}
          />
          {errors.confirm && <p id="registerConfirmPassword-error" className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
        </div>

        <div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeTerms"
              checked={agreeTerms}
              onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'agreeTerms-error' : undefined}
              className="mt-1"
            />
            <label htmlFor="agreeTerms" className="text-sm cursor-pointer leading-relaxed">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-sm text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                Terms of service
              </Link>
              .
            </label>
          </div>
          {errors.terms && <p id="agreeTerms-error" className="mt-1 text-xs text-destructive">{errors.terms}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Read how we use your information in our{' '}
            <Link to="/privacy" target="_blank" className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
              Privacy policy
            </Link>
            .
          </p>
        </div>

        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
