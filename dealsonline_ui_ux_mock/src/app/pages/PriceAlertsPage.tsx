import { useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link } from 'react-router';
import { Target } from 'lucide-react';
import { useLocalAlerts, type LocalPriceAlert } from '../hooks/useLocalStorage';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { PriceAlertRow } from '../features/alerts/components/PriceAlertRow';

/**
 * Price targets (/alerts): the prices a shopper has said they would buy at,
 * saved in this browser.
 *
 * Nothing watches prices or sends anything, so there is no Active/Reached
 * split: those statuses were derived from the price saved alongside the
 * target, which is not a check (design audit §12). When a notification
 * service exists this page becomes "Price alerts" and the statuses return
 * with it. The route and storage key are unchanged so saved targets survive.
 */
export default function PriceAlertsPage() {
  const { alerts, removeAlert, updateAlert } = useLocalAlerts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = (id: string) => {
    removeAlert(id);
    toast.success('Target removed');
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
      toast.error('Enter a price greater than zero.');
      return;
    }
    updateAlert(editingId, price);
    setEditDialogOpen(false);
    toast.success('Target price updated');
  };

  return (
    <div className="page-container py-6">
      <Seo title="Price targets" noindex />
      <div className="mb-6">
        <h1 className="page-title">Price targets</h1>
        <p className="text-sm text-muted-foreground mt-1">Saved in this browser. No notifications are sent.</p>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
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
        <div className="text-center py-16">
          <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" aria-hidden="true" />
          <h2 className="section-title mb-2">No price targets yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Save a target price from a product page.
          </p>
          <Button asChild variant="outline">
            <Link to="/browse">Browse products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
