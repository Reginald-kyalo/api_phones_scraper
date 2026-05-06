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
    toast.success('Notification preferences saved');
  };

  if (authLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.username || user.email.split('@')[0];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-3xl">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">{displayName}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge>Free Plan</Badge>
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
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <BellIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Account Information</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  defaultValue={displayName}
                  className="mt-2"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
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
                  Change Password
                  <Badge variant="outline" className="ml-2 text-[10px]">Coming soon</Badge>
                </Button>
                <Button variant="outline" disabled>
                  Enable 2FA
                  <Badge variant="outline" className="ml-2 text-[10px]">Coming soon</Badge>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priceDropAlerts" className="text-base">
                    Price Drop Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tracked product prices drop
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
                  <Label htmlFor="dailyDealsEmail" className="text-base">
                    Daily Deals Email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily emails with the best deals
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
                  <Label htmlFor="weeklyNewsletter" className="text-base">
                    Weekly Newsletter
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly roundup of trending products and deals
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

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newReviewNotifications" className="text-base">
                    New Review Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new reviews are posted on favorited products
                  </p>
                </div>
                <Switch
                  id="newReviewNotifications"
                  checked={notificationPrefs.newReviewNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs({ ...notificationPrefs, newReviewNotifications: checked })
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSaveNotifications}
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Subscription & Billing</h2>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Free Plan</h3>
                    <p className="text-muted-foreground">Limited features</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Premium for unlimited price alerts, advanced filters, and more.
                </p>
                <Button>
                  Upgrade to Premium
                  <Badge variant="outline" className="ml-2 text-[10px] border-primary-foreground/30 text-primary-foreground">Coming soon</Badge>
                </Button>
              </div>

              <div>
                <h3 className="font-bold mb-4">Premium Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Unlimited price alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Advanced price history (90 days)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Priority notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Export price data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>No ads</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Privacy & Security</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Data & Privacy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your data and privacy settings
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Download My Data
                    <Badge variant="outline" className="ml-auto text-[10px]">Coming soon</Badge>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    Privacy Settings
                    <Badge variant="outline" className="ml-auto text-[10px]">Coming soon</Badge>
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-bold mb-2 text-red-600">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-300" disabled>
                  Delete Account
                  <Badge variant="outline" className="ml-2 text-[10px] border-red-300 text-red-500">Coming soon</Badge>
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
          Logout
        </Button>
      </div>
    </div>
  );
}
