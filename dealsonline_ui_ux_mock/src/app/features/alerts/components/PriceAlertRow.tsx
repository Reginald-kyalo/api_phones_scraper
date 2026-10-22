import { Link } from 'react-router';
import { Edit2, Trash2 } from 'lucide-react';
import { type LocalPriceAlert } from '../../../hooks/useLocalStorage';
import { checkedDate, formatPrice } from '../../../lib/format';
import { Button } from '../../../components/ui/button';
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

/**
 * One saved target: the product, the target, and the lowest listed price at
 * the moment it was saved. No status badge and no "watching": the row shows
 * two saved numbers and a date, which is all this feature holds.
 */
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
      <div className="mb-4">
        <Link
          to={`/prices/${encodeURIComponent(alert.product_id)}`}
          className="font-semibold text-base text-foreground hover:underline underline-offset-4"
        >
          {alert.name}
        </Link>
        <p className="text-sm text-muted-foreground mt-1">Saved {checkedDate(alert.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="microcopy-label">Your target</p>
          <p className="text-lg font-semibold text-foreground price-num">{formatPrice(alert.targetPrice)}</p>
        </div>
        <div>
          <p className="microcopy-label">Price when saved</p>
          <p className="text-lg font-semibold text-foreground price-num">{formatPrice(alert.currentPrice)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link to={`/prices/${encodeURIComponent(alert.product_id)}`}>View prices</Link>
        </Button>

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
              <DialogDescription>Saved in this browser. No notifications are sent.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEdit();
              }}
            >
              <div>
                <Label htmlFor="editPrice">Target price (KES)</Label>
                <Input
                  id="editPrice"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={editPrice}
                  onChange={(e) => onEditPriceChange(e.target.value)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Price when saved: {formatPrice(alert.currentPrice)}
                </p>
              </div>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this target?</AlertDialogTitle>
              <AlertDialogDescription>
                The target for {alert.name} will be removed from this browser.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep target</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(alert.alert_id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove target
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
