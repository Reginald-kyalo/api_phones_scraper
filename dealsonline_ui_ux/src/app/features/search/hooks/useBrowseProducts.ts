import { useQuery } from '@tanstack/react-query';
import { pricerunnerApi } from '../../../lib/api';

export function useBrowseProducts(productType: string, options: any) {
  return useQuery({
    queryKey: ['browse-products', productType, options],
    queryFn: () => pricerunnerApi.getProducts(productType, options),
    enabled: !!productType,
  });
}
