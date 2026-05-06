import { useQuery } from '@tanstack/react-query';
import { pricerunnerApi } from '../lib/api';

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

export function useBrowseProducts(productType: string, options: any) {
  return useQuery({
    queryKey: ['browse-products', productType, options],
    queryFn: () => pricerunnerApi.getProducts(productType, options),
    enabled: !!productType,
  });
}
