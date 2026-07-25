import { StarRating } from './ProductHero';
import { type RatingBreakdown, PLACEHOLDER_REVIEWS } from '../../../data/mockServices';
import { Star } from 'lucide-react';

interface ReviewSectionProps {
  ratingData: RatingBreakdown;
}

export function ReviewSection({ ratingData }: ReviewSectionProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
      <h2 className="text-xl font-bold text-foreground mb-5">Reviews</h2>

      {ratingData.total === 0 ? (
        <div className="text-center py-12">
          <Star className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-muted-foreground">No reviews yet for this product.</p>
        </div>
      ) : (
        <>
          {/* Rating summary */}
          <div className="flex flex-col sm:flex-row gap-8 mb-8">
            {/* Left: big number */}
            <div className="flex flex-col items-center sm:items-start sm:min-w-[140px]">
              <span className="text-5xl font-bold text-foreground">{ratingData.average.toFixed(1)}</span>
              <StarRating rating={ratingData.average} size={20} />
              <span className="text-sm text-muted-foreground mt-1">{ratingData.total} ratings</span>
            </div>

            {/* Right: breakdown bars */}
            <div className="flex-1 space-y-2 max-w-md">
              {ratingData.distribution.map(d => (
                <div key={d.stars} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-8 text-right">{d.stars}★</span>
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review cards */}
          <div className="space-y-4">
            {PLACEHOLDER_REVIEWS.map((rev, i) => (
              <div key={i} className="bg-white rounded-xl p-5 ultra-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {rev.name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{rev.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{rev.date}</span>
                    </div>
                  </div>
                  <StarRating rating={rev.rating} size={14} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{rev.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
