import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, Edit2, Trash2, Pause, Play } from 'lucide-react';
import {
  getPriceAlerts,
  deletePriceAlert,
  updatePriceAlert,
  isAuthenticated,
  PriceAlert,
} from '../utils/localStorage';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function PriceAlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }
    loadAlerts();
  }, [navigate]);

  const loadAlerts = () => {
    setAlerts(getPriceAlerts());
  };

  const handleDelete = (id: string) => {
    deletePriceAlert(id);
    loadAlerts();
    toast.success('Alert deleted');
  };

  const handleTogglePause = (alert: PriceAlert) => {
    const newStatus = alert.status === 'paused' ? 'active' : 'paused';
    updatePriceAlert(alert.id, { status: newStatus });
    loadAlerts();
    toast.success(newStatus === 'paused' ? 'Alert paused' : 'Alert resumed');
  };

  const handleEditOpen = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setEditPrice(alert.targetPrice.toString());
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingAlert) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    updatePriceAlert(editingAlert.id, { targetPrice: price });
    loadAlerts();
    setEditDialogOpen(false);
    toast.success('Alert updated');
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const triggeredAlerts = alerts.filter((a) => a.status === 'triggered');
  const pausedAlerts = alerts.filter((a) => a.status === 'paused');

  const AlertRow = ({ alert }: { alert: PriceAlert }) => {
    const progress = Math.min(100, (alert.targetPrice / alert.currentPrice) * 100);

    return (
      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link
              to={`/product/${alert.productId}`}
              className="font-medium text-lg hover:text-orange-600 transition-colors"
            >
              {alert.productName}
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              Created on {new Date(alert.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={
              alert.status === 'active'
                ? 'default'
                : alert.status === 'triggered'
                ? 'default'
                : 'secondary'
            }
            className={
              alert.status === 'triggered'
                ? 'bg-green-600'
                : alert.status === 'paused'
                ? 'bg-gray-400'
                : ''
            }
          >
            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Target Price</p>
            <p className="text-xl font-bold">${alert.targetPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Price</p>
            <p className="text-xl font-bold">${alert.currentPrice.toFixed(2)}</p>
          </div>
        </div>

        {alert.status === 'active' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progress to target</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {alert.status === 'triggered' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-sm font-medium">
              🎉 Price dropped to ${alert.targetPrice.toFixed(2)}! Check it out now.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {alert.status !== 'triggered' && (
            <>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditOpen(alert)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Price Alert</DialogTitle>
                    <DialogDescription>
                      Update your target price for this product
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="editPrice">Target Price (NZD)</Label>
                      <Input
                        id="editPrice"
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Current price: ${alert.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      onClick={handleEditSave}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTogglePause(alert)}
              >
                {alert.status === 'paused' ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            </>
          )}

          {alert.status === 'triggered' && (
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700" asChild>
              <Link to={`/product/${alert.productId}`}>View Deal</Link>
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Price Alert?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your price alert
                  for {alert.productName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(alert.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Price Alerts</h1>
        <p className="text-gray-600">Manage your price drop notifications</p>
      </div>

      {alerts.length > 0 ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="triggered">
              Triggered ({triggeredAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused ({pausedAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeAlerts.length > 0 ? (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-lg">
                <p className="text-gray-600">No active alerts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="triggered" className="mt-6">
            {triggeredAlerts.length > 0 ? (
              <div className="space-y-4">
                {triggeredAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-lg">
                <p className="text-gray-600">No triggered alerts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paused" className="mt-6">
            {pausedAlerts.length > 0 ? (
              <div className="space-y-4">
                {pausedAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-gray-200 rounded-lg">
                <p className="text-gray-600">No paused alerts</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No price alerts set</h2>
          <p className="text-gray-600 mb-6">
            Create price alerts on product pages to get notified when prices drop
          </p>
          <Button className="bg-orange-600 hover:bg-orange-700" asChild>
            <Link to="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
