import { useQuery } from '@tanstack/react-query';
import { pricerunnerApi } from '../../../lib/api';

export function useProductDetail(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => pricerunnerApi.getProduct(productId),
    enabled: !!productId,
  });
}

export function useRelatedProducts(productId: string, limit = 8) {
  return useQuery({
    queryKey: ['related-products', productId, limit],
    queryFn: () => pricerunnerApi.getRelatedProducts(productId, limit),
    enabled: !!productId,
  });
}
