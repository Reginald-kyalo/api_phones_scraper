import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '../../../components/ui/carousel';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  seeAllLink?: string;
  seeAllText?: string;
  children: React.ReactNode;
}

export default function ProductCarousel({
  title,
  subtitle,
  seeAllLink,
  seeAllText = 'See all',
  children,
}: ProductCarouselProps) {
  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="section-header">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="flex items-center gap-1 text-sm font-medium text-link hover:underline"
          >
            {seeAllText}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Carousel */}
      <Carousel
        opts={{
          align: 'start',
          loop: false,
          skipSnaps: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {children}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-3 h-8 w-8 border-border shadow-sm" />
        <CarouselNext className="hidden sm:flex -right-3 h-8 w-8 border-border shadow-sm" />
      </Carousel>
    </section>
  );
}

/** Responsive carousel slot — wraps each card */
export function ProductCarouselItem({ children }: { children: React.ReactNode }) {
  return (
    <CarouselItem className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
      {children}
    </CarouselItem>
  );
}
