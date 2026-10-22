import { useEffect } from 'react';
import { Seo } from '../components/common/Seo';
import { useNavigate } from 'react-router';
import { User as UserIcon, Shield, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BRAND } from '../lib/brand';

/**
 * Your account. Two tabs, each describing something that exists: the
 * details the account holds, and how to ask for a copy or deletion of them.
 *
 * Gone (design audit §13): the Emails tab whose Save button confirmed
 * settings nothing stored; the Plan tab for a service with one free tier;
 * and the "Coming soon" buttons for password change, two-step sign-in,
 * export and deletion. A request channel that works is a mail to support,
 * so that is what is offered.
 */
export default function AccountPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth?redirect=/account');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="page-container py-16 flex justify-center" aria-busy="true" aria-label="Loading account">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.username || user.email.split('@')[0];
  const mail = (subject: string) => `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="prose-container py-8">
      <Seo title="Your account" noindex />
      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 bg-canvas-ink rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-xl">{displayName.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="page-title mb-1">Your account</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <UserIcon className="w-4 h-4" aria-hidden="true" />
            Details
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Shield className="w-4 h-4" aria-hidden="true" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Details</h2>
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" defaultValue={displayName} className="mt-2" readOnly />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" defaultValue={user.email} className="mt-2" readOnly />
              </div>
              <p className="text-sm text-muted-foreground">
                To change these details,{' '}
                <a href={mail('Change my account details')} className="text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                  contact us
                </a>
                .
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Privacy</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Your information</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Favourites, price targets and comparisons are saved in this browser, not in your account.
                  Your account holds your name and email address.
                </p>
                <Button variant="outline" asChild>
                  <a href={mail('Request a copy of my data')}>Request a copy of your data</a>
                </Button>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-2">Delete your account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting your account removes your name and email address from SokoPulse. Items saved in
                  this browser are not affected; clear this site’s data in your browser to remove them.
                </p>
                <Button variant="outline" className="text-destructive hover:text-destructive/80 border-destructive/30" asChild>
                  <a href={mail('Request account deletion')}>Request account deletion</a>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center">
        <Button onClick={handleLogout} variant="outline" className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
