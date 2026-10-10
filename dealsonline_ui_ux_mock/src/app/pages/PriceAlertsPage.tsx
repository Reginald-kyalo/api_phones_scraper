import { useState } from 'react';
import { Seo } from '../components/common/Seo';
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
    toast.success('Alert removed');
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
      toast.error('Enter a price above zero');
      return;
    }
    updateAlert(editingId, price);
    setEditDialogOpen(false);
    toast.success('Alert updated');
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="page-container py-6">
      <Seo title="Price alerts" noindex />
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Price alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">We’ll tell you when a product drops below your target price.</p>
      </div>

      {alerts.length > 0 ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
            <TabsTrigger value="triggered">Reached ({triggeredAlerts.length})</TabsTrigger>
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
              <div className="text-center py-12 border border-border rounded-md bg-surface-alt">
                <p className="text-muted-foreground">No active alerts.</p>
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
              <div className="text-center py-12 border border-border rounded-md bg-surface-alt">
                <p className="text-muted-foreground">No alert has reached its target yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" aria-hidden="true" />
          <h2 className="section-title mb-2">No price alerts yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Use “Set a price alert” on any product page.
          </p>
          <Button asChild variant="outline">
            <Link to="/browse">Browse categories</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
