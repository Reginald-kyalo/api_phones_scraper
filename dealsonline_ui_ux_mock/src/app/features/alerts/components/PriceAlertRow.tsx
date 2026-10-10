import { Link } from 'react-router';
import { Edit2, Trash2 } from 'lucide-react';
import { type LocalPriceAlert } from '../../../hooks/useLocalStorage';
import { formatPrice } from '../../../lib/format';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
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
} from '../../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface PriceAlertRowProps {
  alert: LocalPriceAlert;
  onEdit: (alert: LocalPriceAlert) => void;
  onDelete: (id: string) => void;
  editPrice: string;
  onEditPriceChange: (val: string) => void;
  onSaveEdit: () => void;
  isEditing: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceAlertRow({
  alert,
  onEdit,
  onDelete,
  editPrice,
  onEditPriceChange,
  onSaveEdit,
  isEditing,
  onOpenChange,
}: PriceAlertRowProps) {
  return (
    <div className="border border-border rounded-md p-5 bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Link
            to={`/prices/${encodeURIComponent(alert.product_id)}`}
            className="font-semibold text-base text-foreground hover:underline underline-offset-4"
          >
            {alert.name}
          </Link>
          <p className="text-sm text-muted-foreground mt-1">
            Set on {new Date(alert.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <Badge variant={alert.triggered ? 'default' : 'outline'} className={alert.triggered ? 'bg-success' : ''}>
          {alert.triggered ? 'Reached' : 'Active'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="microcopy-label">Your target</p>
          <p className="text-lg font-semibold text-foreground price-num">{formatPrice(alert.targetPrice)}</p>
        </div>
        <div>
          <p className="microcopy-label">Best price now</p>
          <p className="text-lg font-semibold text-foreground price-num">{formatPrice(alert.currentPrice)}</p>
        </div>
      </div>

      {!alert.triggered && (
        <div className="bg-surface-alt rounded-md p-3 mb-4">
          <p className="text-sm text-muted-foreground">
            {alert.currentPrice > alert.targetPrice
              ? `${formatPrice(alert.currentPrice - alert.targetPrice)} above your target`
              : 'Your target price has been reached.'}
          </p>
        </div>
      )}

      {alert.triggered && (
        <div className="bg-success/10 border border-success/30 rounded-md p-3 mb-4">
          <p className="text-success text-sm font-medium">
            The best price is now {formatPrice(alert.currentPrice)}.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {!alert.triggered && (
          <Dialog open={isEditing} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onEdit(alert)}>
                <Edit2 className="w-4 h-4" aria-hidden="true" />
                Change target
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change target price</DialogTitle>
                <DialogDescription>We’ll email you when a shop goes below it.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="editPrice">Target price (KES)</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    value={editPrice}
                    onChange={(e) => onEditPriceChange(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Best price now: {formatPrice(alert.currentPrice)}
                  </p>
                </div>
                <Button onClick={onSaveEdit} className="w-full">
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {alert.triggered && (
          <Button size="sm" asChild>
            <Link to={`/prices/${encodeURIComponent(alert.product_id)}`}>See prices</Link>
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this alert?</AlertDialogTitle>
              <AlertDialogDescription>
                We’ll stop watching the price of {alert.name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(alert.alert_id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
