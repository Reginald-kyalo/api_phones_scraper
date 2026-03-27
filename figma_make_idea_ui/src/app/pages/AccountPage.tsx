import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User as UserIcon, Bell as BellIcon, CreditCard, Shield, LogOut } from 'lucide-react';
import {
  getCurrentUser,
  logout,
  isAuthenticated,
  getNotificationPreferences,
  updateNotificationPreferences,
  User,
} from '../utils/localStorage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState(getNotificationPreferences());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }
    setUser(getCurrentUser());
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  const handleSaveNotifications = () => {
    updateNotificationPreferences(notificationPrefs);
    toast.success('Notification preferences saved');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-orange-600">
                  {user.subscription === 'premium' ? 'Premium' : 'Free'} Plan
                </Badge>
                <span className="text-sm text-gray-500">Region: {user.region}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">
            <UserIcon className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellIcon className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Account Information</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  defaultValue={user.name}
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

              <div>
                <Label htmlFor="region">Region</Label>
                <Select defaultValue={user.region} disabled>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NZ">New Zealand</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="mr-2">
                  Change Password
                </Button>
                <Button variant="outline">
                  Enable Two-Factor Authentication
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priceDropAlerts" className="text-base">
                    Price Drop Alerts
                  </Label>
                  <p className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-600">
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
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Subscription & Billing</h2>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {user.subscription === 'premium' ? 'Premium Plan' : 'Free Plan'}
                    </h3>
                    <p className="text-gray-600">
                      {user.subscription === 'premium'
                        ? '$9.99/month'
                        : 'Limited features'}
                    </p>
                  </div>
                  {user.subscription === 'premium' && (
                    <Badge className="bg-orange-600">Active</Badge>
                  )}
                </div>
                
                {user.subscription === 'premium' ? (
                  <>
                    <p className="text-sm text-gray-700 mb-4">
                      Next billing date: March 15, 2026
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline">Manage Subscription</Button>
                      <Button variant="outline" className="text-red-600 hover:text-red-700">
                        Cancel Subscription
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 mb-4">
                      Upgrade to Premium for unlimited price alerts, advanced filters, and more.
                    </p>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      Upgrade to Premium
                    </Button>
                  </>
                )}
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
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">Privacy & Security</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Data & Privacy</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage your data and privacy settings
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Privacy Settings
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-bold mb-2 text-red-600">Danger Zone</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-300">
                  Delete Account
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
          className="text-gray-600 hover:text-gray-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
