import { supabase } from '@/lib/supabase';
import type { DeliveryEta, DeliveryQuote, RestaurantQuote } from '@/types/database';

export interface QuoteTarget {
  addressId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const etaService = {
  estimate: async (orderId: string): Promise<DeliveryEta | null> => {
    const { data, error } = await supabase.rpc('estimate_delivery_eta', {
      p_order_id: orderId,
    });
    if (error) throw error;
    return (data as DeliveryEta | null) ?? null;
  },

  quote: async (restaurantId: string, target: QuoteTarget = {}): Promise<DeliveryQuote | null> => {
    const { data, error } = await supabase.rpc('quote_delivery_estimate', {
      p_restaurant_id: restaurantId,
      p_address_id: target.addressId ?? null,
      p_latitude: target.latitude ?? null,
      p_longitude: target.longitude ?? null,
    });
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as DeliveryQuote | undefined;
    return row ?? null;
  },

  quoteMany: async (
    restaurantIds: string[],
    target: QuoteTarget = {}
  ): Promise<RestaurantQuote[]> => {
    if (restaurantIds.length === 0) return [];

    const { data, error } = await supabase.rpc('quote_delivery_estimates', {
      p_restaurant_ids: restaurantIds,
      p_address_id: target.addressId ?? null,
      p_latitude: target.latitude ?? null,
      p_longitude: target.longitude ?? null,
    });
    if (error) throw error;

    return (data ?? []) as RestaurantQuote[];
  },
};
