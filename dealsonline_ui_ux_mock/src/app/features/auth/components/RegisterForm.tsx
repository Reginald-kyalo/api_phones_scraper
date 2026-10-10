import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Fill in every field to create an account.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('The two passwords don’t match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Use a password of at least 6 characters.');
      return;
    }

    if (!agreeTerms) {
      toast.error('Accept the terms of service to continue.');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      toast.success('Account created');
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.message || 'We couldn’t create your account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="registerName">Name</Label>
          <Input
            id="registerName"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="registerEmail">Email</Label>
          <Input
            id="registerEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="registerPassword">Password</Label>
          <div className="relative mt-2">
            <Input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="registerConfirmPassword">Confirm password</Label>
          <Input
            id="registerConfirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-2"
          />
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreeTerms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
            className="mt-1"
          />
          <label htmlFor="agreeTerms" className="text-sm cursor-pointer leading-relaxed">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-sm text-link hover:underline underline-offset-4">
              terms of service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-sm text-link hover:underline underline-offset-4">
              privacy policy
            </Link>
          </label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
