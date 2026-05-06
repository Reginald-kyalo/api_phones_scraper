import { Link } from 'react-router';
import { Edit2, Trash2 } from 'lucide-react';
import { type LocalPriceAlert } from '../../../hooks/useLocalStorage';
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
    <div className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
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
          <p className="text-xl font-semibold text-foreground">£{alert.targetPrice.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-xl font-semibold text-foreground">£{alert.currentPrice.toLocaleString()}</p>
        </div>
      </div>

      {!alert.triggered && (
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-muted-foreground">
            {alert.currentPrice > alert.targetPrice
              ? `£${(alert.currentPrice - alert.targetPrice).toLocaleString()} away from target`
              : 'Target price reached!'}
          </p>
        </div>
      )}

      {alert.triggered && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-800 text-sm font-medium">
            Price dropped to £{alert.currentPrice.toLocaleString()}!
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {!alert.triggered && (
          <Dialog open={isEditing} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onEdit(alert)}>
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
                  <Label htmlFor="editPrice">Target Price (£)</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    value={editPrice}
                    onChange={(e) => onEditPriceChange(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Current price: £{alert.currentPrice.toLocaleString()}
                  </p>
                </div>
                <Button onClick={onSaveEdit} className="w-full">
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
                onClick={() => onDelete(alert.alert_id)}
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
}
