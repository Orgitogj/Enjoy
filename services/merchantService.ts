import { supabase } from '@/lib/supabase';
import type {
  Dish,
  HoursRange,
  MerchantMenuCategory,
  MerchantOrder,
  Order,
  OrderStatus,
  Restaurant,
  RestaurantHours,
} from '@/types/database';

export interface DishPatch {
  name?: string;
  description?: string | null;
  price?: number;
  isAvailable?: boolean;
  isPopular?: boolean;
  dietaryTags?: string[];
}

export const merchantService = {
  listManagedRestaurants: async (userId: string): Promise<Restaurant[]> => {
    const { data, error } = await supabase
      .from('restaurant_members')
      .select('restaurant:restaurants(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return ((data ?? []) as unknown as { restaurant: Restaurant | null }[])
      .map((row) => row.restaurant)
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));
  },

  listOrders: async (restaurantId: string, statuses: OrderStatus[]): Promise<MerchantOrder[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), address:addresses(*)')
      .eq('restaurant_id', restaurantId)
      .in('status', statuses)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as MerchantOrder[];
  },

  menu: async (restaurantId: string): Promise<MerchantMenuCategory[]> => {
    const { data, error } = await supabase.rpc('merchant_menu', {
      p_restaurant_id: restaurantId,
    });
    if (error) throw error;
    return (data ?? []) as MerchantMenuCategory[];
  },

  setDishAvailable: async (dishId: string, isAvailable: boolean): Promise<Dish> => {
    const { data, error } = await supabase.rpc('merchant_set_dish_available', {
      p_dish_id: dishId,
      p_is_available: isAvailable,
    });
    if (error) throw error;
    return data as Dish;
  },

  updateDish: async (dishId: string, patch: DishPatch): Promise<Dish> => {
    const { data, error } = await supabase.rpc('merchant_update_dish', {
      p_dish_id: dishId,
      p_name: patch.name ?? null,
      p_description: patch.description ?? null,
      p_price: patch.price ?? null,
      p_is_available: patch.isAvailable ?? null,
      p_is_popular: patch.isPopular ?? null,
      p_dietary_tags: patch.dietaryTags ?? null,
    });
    if (error) throw error;
    return data as Dish;
  },

  listHours: async (restaurantId: string): Promise<RestaurantHours[]> => {
    const { data, error } = await supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('day_of_week')
      .order('opens_at');
    if (error) throw error;
    return (data ?? []) as RestaurantHours[];
  },

  setHours: async (restaurantId: string, hours: HoursRange[]): Promise<RestaurantHours[]> => {
    const { data, error } = await supabase.rpc('merchant_set_restaurant_hours', {
      p_restaurant_id: restaurantId,
      p_hours: hours,
    });
    if (error) throw error;
    return (data ?? []) as RestaurantHours[];
  },

  setStorePaused: async (
    restaurantId: string,
    paused: boolean,
    until: string | null
  ): Promise<Restaurant> => {
    const { data, error } = await supabase.rpc('merchant_set_store_paused', {
      p_restaurant_id: restaurantId,
      p_paused: paused,
      p_until: until,
    });
    if (error) throw error;
    return data as Restaurant;
  },

  setPrepTime: async (restaurantId: string, minutes: number): Promise<Restaurant> => {
    const { data, error } = await supabase.rpc('merchant_set_prep_time', {
      p_restaurant_id: restaurantId,
      p_minutes: minutes,
    });
    if (error) throw error;
    return data as Restaurant;
  },

  updateRestaurant: async (
    restaurantId: string,
    patch: { name?: string; description?: string | null; deliveryFee?: number; minOrder?: number }
  ): Promise<Restaurant> => {
    const { data, error } = await supabase.rpc('merchant_update_restaurant', {
      p_restaurant_id: restaurantId,
      p_name: patch.name ?? null,
      p_description: patch.description ?? null,
      p_delivery_fee: patch.deliveryFee ?? null,
      p_min_order: patch.minOrder ?? null,
    });
    if (error) throw error;
    return data as Restaurant;
  },

  transitionOrder: async (
    orderId: string,
    to: OrderStatus,
    reason?: string | null
  ): Promise<Order> => {
    const { data, error } = await supabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_to: to,
      p_reason: reason ?? null,
    });
    if (error) throw error;
    return data as Order;
  },
};
