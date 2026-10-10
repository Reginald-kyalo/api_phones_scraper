import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User as UserIcon, Bell as BellIcon, CreditCard, Shield, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [notificationPrefs, setNotificationPrefs] = useState({
    priceDropAlerts: true,
    dailyDealsEmail: false,
    weeklyNewsletter: true,
    newReviewNotifications: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth?redirect=/account');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveNotifications = () => {
    toast.success('Email settings saved');
  };

  if (authLoading) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.username || user.email.split('@')[0];

  return (
    <div className="prose-container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-canvas-ink rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="page-title mb-1">{displayName}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">Free account</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <BellIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Emails</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Plan</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Your details</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  defaultValue={displayName}
                  className="mt-2"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user.email}
                  className="mt-2"
                  disabled
                />
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="mr-2" disabled>
                  Change password
                  <Badge variant="outline" className="ml-2 text-[10px]">Coming soon</Badge>
                </Button>
                <Button variant="outline" disabled>
                  Turn on two-step sign-in
                  <Badge variant="outline" className="ml-2 text-[10px]">Coming soon</Badge>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Emails</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priceDropAlerts">
                    Price alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Email me when a product I’m watching drops below my target price.
                  </p>
                </div>
                <Switch
                  id="priceDropAlerts"
                  checked={notificationPrefs.priceDropAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, priceDropAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dailyDealsEmail">
                    Daily deals
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    One email a day with the biggest savings we found.
                  </p>
                </div>
                <Switch
                  id="dailyDealsEmail"
                  checked={notificationPrefs.dailyDealsEmail}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, dailyDealsEmail: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyNewsletter">
                    Weekly price drops
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    One email a week with notable price changes.
                  </p>
                </div>
                <Switch
                  id="weeklyNewsletter"
                  checked={notificationPrefs.weeklyNewsletter}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, weeklyNewsletter: checked })
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSaveNotifications}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Plan</h2>
            
            <div className="space-y-6">
              <div className="border border-border rounded-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold">Free</h3>
                    <p className="text-sm text-muted-foreground">Comparing prices and setting alerts is free.</p>
                  </div>
                </div>
                
              </div>

            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="bg-card border border-border rounded-md p-6">
            <h2 className="section-title mb-6">Privacy</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Your data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download or delete what SokoPulse stores about you.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Download my data
                    <Badge variant="outline" className="ml-auto text-[10px]">Coming soon</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Privacy settings
                    <Badge variant="outline" className="ml-auto text-[10px]">Coming soon</Badge>
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-2">Delete account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting your account removes your favourites, alerts and email settings. It can’t be undone.
                </p>
                <Button variant="outline" className="text-destructive hover:text-destructive/80 border-destructive/30" disabled>
                  Delete account
                  <Badge variant="outline" className="ml-2 text-[10px] border-destructive/30 text-destructive">Coming soon</Badge>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Logout Button */}
      <div className="mt-8 text-center">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
