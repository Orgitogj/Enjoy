import useAuthStore from '@/hooks/use-auth-store';
import { MERCHANT_ACTIVE_STATUSES } from '@/constants/orderStatus';
import { useRealtimeTable } from '@/hooks/useRealtime';
import { merchantService, type DishPatch } from '@/services/merchantService';
import type {
  Dish,
  HoursRange,
  MerchantMenuCategory,
  OrderStatus,
} from '@/types/database';
import { currentSessionEpoch, isStaleSession } from '@/utils/sessionGuard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useManagedRestaurants = () => {
  const { user } = useAuthStore();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['managed-restaurants', userId],
    queryFn: () => merchantService.listManagedRestaurants(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });

  return {
    restaurants: query.data ?? [],
    isLoading: query.isLoading,
    isMerchant: (query.data ?? []).length > 0,
  };
};

export const useMerchantOrders = (restaurantId: string | undefined, showHistory = false) => {
  const statuses: OrderStatus[] = showHistory
    ? ['delivered', 'cancelled', 'restaurant_rejected', 'refunded']
    : MERCHANT_ACTIVE_STATUSES;

  useRealtimeTable({
    channel: `merchant-orders-${restaurantId ?? 'none'}`,
    table: 'orders',
    filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
    enabled: !!restaurantId,
    invalidate: [['merchant-orders', restaurantId, showHistory]],
  });

  return useQuery({
    queryKey: ['merchant-orders', restaurantId, showHistory],
    queryFn: () => merchantService.listOrders(restaurantId!, statuses),
    enabled: !!restaurantId,
  });
};

export const useTransitionOrder = (restaurantId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      to,
      reason,
    }: {
      orderId: string;
      to: OrderStatus;
      reason?: string | null;
    }) => merchantService.transitionOrder(orderId, to, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const setAvailabilityInMenu = (
  menu: MerchantMenuCategory[] | undefined,
  dishId: string,
  isAvailable: boolean
): MerchantMenuCategory[] =>
  (menu ?? []).map((category) => ({
    ...category,
    dishes: category.dishes.map((dish) =>
      dish.id === dishId ? { ...dish, is_available: isAvailable } : dish
    ),
  }));

export const replaceDishInMenu = (
  menu: MerchantMenuCategory[] | undefined,
  dish: Dish
): MerchantMenuCategory[] =>
  (menu ?? []).map((category) => ({
    ...category,
    dishes: category.dishes.map((current) => (current.id === dish.id ? dish : current)),
  }));

export const useMerchantMenu = (restaurantId: string | undefined) =>
  useQuery({
    queryKey: ['merchant-menu', restaurantId],
    queryFn: () => merchantService.menu(restaurantId!),
    enabled: !!restaurantId,
  });

const useCustomerInvalidation = (restaurantId: string | undefined) => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['merchant-menu', restaurantId] });
    void queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    void queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
    void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    void queryClient.invalidateQueries({ queryKey: ['dishes'] });
    void queryClient.invalidateQueries({ queryKey: ['cart-validation'] });
    void queryClient.invalidateQueries({ queryKey: ['managed-restaurants'] });
  }, [queryClient, restaurantId]);
};

export const useSetDishAvailable = (restaurantId: string | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = useCustomerInvalidation(restaurantId);
  const menuKey = ['merchant-menu', restaurantId];

  return useMutation({
    mutationFn: ({ dishId, isAvailable }: { dishId: string; isAvailable: boolean }) =>
      merchantService.setDishAvailable(dishId, isAvailable),
    onMutate: async ({ dishId, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: menuKey });
      const previous = queryClient.getQueryData<MerchantMenuCategory[]>(menuKey);
      queryClient.setQueryData<MerchantMenuCategory[]>(menuKey, (current) =>
        setAvailabilityInMenu(current, dishId, isAvailable)
      );
      return { previous, epoch: currentSessionEpoch() };
    },
    onError: (_error, _variables, context) => {
      if (!context || isStaleSession(context.epoch)) return;
      queryClient.setQueryData(menuKey, context.previous);
    },
    onSuccess: (dish) => {
      queryClient.setQueryData<MerchantMenuCategory[]>(menuKey, (current) =>
        replaceDishInMenu(current, dish)
      );
    },
    onSettled: invalidate,
  });
};

export const useUpdateDish = (restaurantId: string | undefined) => {
  const invalidate = useCustomerInvalidation(restaurantId);

  return useMutation({
    mutationFn: ({ dishId, patch }: { dishId: string; patch: DishPatch }) =>
      merchantService.updateDish(dishId, patch),
    onSuccess: invalidate,
  });
};

export const useRestaurantHours = (restaurantId: string | undefined) =>
  useQuery({
    queryKey: ['restaurant-hours', restaurantId],
    queryFn: () => merchantService.listHours(restaurantId!),
    enabled: !!restaurantId,
  });

export const useSetRestaurantHours = (restaurantId: string | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = useCustomerInvalidation(restaurantId);

  return useMutation({
    mutationFn: (hours: HoursRange[]) => merchantService.setHours(restaurantId!, hours),
    onSuccess: (rows) => {
      queryClient.setQueryData(['restaurant-hours', restaurantId], rows);
      invalidate();
    },
  });
};

export const useSetStorePaused = (restaurantId: string | undefined) => {
  const invalidate = useCustomerInvalidation(restaurantId);

  return useMutation({
    mutationFn: ({ paused, until }: { paused: boolean; until: string | null }) =>
      merchantService.setStorePaused(restaurantId!, paused, until),
    onSuccess: invalidate,
  });
};

export const useSetPrepTime = (restaurantId: string | undefined) => {
  const invalidate = useCustomerInvalidation(restaurantId);

  return useMutation({
    mutationFn: (minutes: number) => merchantService.setPrepTime(restaurantId!, minutes),
    onSuccess: invalidate,
  });
};
