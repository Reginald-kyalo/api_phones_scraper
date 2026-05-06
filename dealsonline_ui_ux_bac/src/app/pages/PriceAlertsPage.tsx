import { useState } from 'react';
import { Link } from 'react-router';
import { Bell, Edit2, Trash2 } from 'lucide-react';
import { useLocalAlerts, type LocalPriceAlert } from '../hooks/useLocalStorage';
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
  const { alerts, removeAlert, updateAlert } = useLocalAlerts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = (id: string) => {
    removeAlert(id);
    toast.success('Alert deleted');
  };

  const handleEditOpen = (alert: LocalPriceAlert) => {
    setEditingId(alert.alert_id);
    setEditPrice(alert.targetPrice.toString());
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingId) return;
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    updateAlert(editingId, price);
    setEditDialogOpen(false);
    toast.success('Alert updated');
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  const AlertRow = ({ alert }: { alert: LocalPriceAlert }) => {
    const progress = alert.currentPrice > 0
      ? Math.min(100, (alert.targetPrice / alert.currentPrice) * 100)
      : 0;

    return (
      <div className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link
              to={`/product/${alert.product_id}`}
              className="font-medium text-base hover:text-primary transition-colors"
            >
              {alert.name}
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Created on {new Date(alert.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge className={alert.triggered ? 'bg-green-600' : ''}>
            {alert.triggered ? 'Triggered' : 'Active'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Target Price</p>
            <p className="text-xl font-semibold text-foreground">KES {alert.targetPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-xl font-semibold text-foreground">KES {alert.currentPrice.toLocaleString()}</p>
          </div>
        </div>

        {!alert.triggered && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {alert.currentPrice > alert.targetPrice
                ? `KES ${(alert.currentPrice - alert.targetPrice).toLocaleString()} away from target`
                : 'Target price reached!'}
            </p>
          </div>
        )}

        {alert.triggered && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-sm font-medium">
              Price dropped to KES {alert.currentPrice.toLocaleString()}!
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!alert.triggered && (
            <Dialog open={editDialogOpen && editingId === alert.alert_id} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleEditOpen(alert)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Price Alert</DialogTitle>
                  <DialogDescription>Update your target price for this product</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="editPrice">Target Price (KES)</Label>
                    <Input
                      id="editPrice"
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Current price: KES {alert.currentPrice.toLocaleString()}
                    </p>
                  </div>
                  <Button onClick={handleEditSave} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {alert.triggered && (
            <Button size="sm" asChild>
              <Link to={`/product/${alert.product_id}`}>View Deal</Link>
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
                  This will permanently delete your price alert for {alert.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(alert.alert_id)}
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

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your price drop notifications</p>
      </div>

      {alerts.length > 0 ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
            <TabsTrigger value="triggered">Triggered ({triggeredAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeAlerts.length > 0 ? (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <AlertRow key={alert.alert_id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-border rounded-lg">
                <p className="text-muted-foreground">No active alerts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="triggered" className="mt-6">
            {triggeredAlerts.length > 0 ? (
              <div className="space-y-4">
                {triggeredAlerts.map((alert) => (
                  <AlertRow key={alert.alert_id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-border rounded-lg">
                <p className="text-muted-foreground">No triggered alerts</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No price alerts set</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Create price alerts on product pages to get notified when prices drop
          </p>
          <Button asChild>
            <Link to="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
