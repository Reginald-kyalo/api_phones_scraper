import { X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImageLightbox({ src, alt, open, onOpenChange }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 overflow-hidden bg-black/95 border-0">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
          aria-label="Close lightbox"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="w-full h-full flex items-center justify-center p-6">
          <ImageWithFallback
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="text-white text-sm">Click outside to close</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
