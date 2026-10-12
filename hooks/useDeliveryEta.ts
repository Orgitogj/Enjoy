import { useAddressSelectionStore } from '@/hooks/use-address-store';
import { etaService, type QuoteTarget } from '@/services/etaService';
import type { DeliveryQuote } from '@/types/database';
import { describeQuote } from '@/utils/eta';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const useDeliveryQuote = (restaurantId: string | undefined, target: QuoteTarget = {}) => {
  const addressId = target.addressId ?? null;

  return useQuery({
    queryKey: [
      'delivery-quote',
      restaurantId,
      addressId,
      target.latitude ?? null,
      target.longitude ?? null,
    ],
    queryFn: () => etaService.quote(restaurantId!, { ...target, addressId }),
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useRestaurantEtaLabels = (
  restaurantIds: string[]
): Record<string, string | null> => {
  const selectedAddressId = useAddressSelectionStore((state) => state.selectedAddressId);
  const key = useMemo(() => [...restaurantIds].sort().join(','), [restaurantIds]);

  const query = useQuery({
    queryKey: ['delivery-quotes', key, selectedAddressId],
    queryFn: () => etaService.quoteMany(restaurantIds, { addressId: selectedAddressId }),
    enabled: !!selectedAddressId && restaurantIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  return useMemo(() => {
    const labels: Record<string, string | null> = {};
    (query.data ?? []).forEach((quote) => {
      labels[quote.restaurant_id] = describeQuote(quote.eta_min_minutes, quote.eta_max_minutes);
    });
    return labels;
  }, [query.data]);
};

export const quoteLabel = (quote: DeliveryQuote | null): string | null =>
  quote ? describeQuote(quote.eta_min_minutes, quote.eta_max_minutes) : null;
