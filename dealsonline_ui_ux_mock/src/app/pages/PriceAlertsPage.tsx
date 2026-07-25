import { useState } from 'react';
import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useLocalAlerts, type LocalPriceAlert } from '../hooks/useLocalStorage';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { PriceAlertRow } from '../features/alerts/components/PriceAlertRow';

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
                  <PriceAlertRow 
                    key={alert.alert_id} 
                    alert={alert}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                    editPrice={editPrice}
                    onEditPriceChange={setEditPrice}
                    onSaveEdit={handleEditSave}
                    isEditing={editDialogOpen && editingId === alert.alert_id}
                    onOpenChange={setEditDialogOpen}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-border rounded-lg bg-surface-alt">
                <p className="text-muted-foreground">No active alerts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="triggered" className="mt-6">
            {triggeredAlerts.length > 0 ? (
              <div className="space-y-4">
                {triggeredAlerts.map((alert) => (
                  <PriceAlertRow 
                    key={alert.alert_id} 
                    alert={alert}
                    onEdit={handleEditOpen}
                    onDelete={handleDelete}
                    editPrice={editPrice}
                    onEditPriceChange={setEditPrice}
                    onSaveEdit={handleEditSave}
                    isEditing={editDialogOpen && editingId === alert.alert_id}
                    onOpenChange={setEditDialogOpen}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-border rounded-lg bg-surface-alt">
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
