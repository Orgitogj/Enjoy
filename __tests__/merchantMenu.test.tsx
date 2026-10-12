jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockSetDishAvailable = jest.fn();
const mockUpdateDish = jest.fn();
const mockMenu = jest.fn();

jest.mock('@/services/merchantService', () => ({
  merchantService: {
    menu: (...args: unknown[]) => mockMenu(...args),
    setDishAvailable: (...args: unknown[]) => mockSetDishAvailable(...args),
    updateDish: (...args: unknown[]) => mockUpdateDish(...args),
  },
}));

import {
  replaceDishInMenu,
  setAvailabilityInMenu,
  useSetDishAvailable,
} from '@/hooks/useMerchant';
import type { Dish, MerchantMenuCategory } from '@/types/database';
import { bumpSessionEpoch, resetSessionEpochForTests } from '@/utils/sessionGuard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const dish = (id: string, overrides: Partial<Dish> = {}): Dish =>
  ({
    id,
    restaurant_id: 'r1',
    menu_category_id: 'c1',
    name: `Dish ${id}`,
    description: 'Tasty',
    price: 10,
    image_url: null,
    is_popular: false,
    is_available: true,
    dietary_tags: [],
    sort_order: 0,
    ...overrides,
  }) as Dish;

const menu = (): MerchantMenuCategory[] => [
  { id: 'c1', name: 'Mains', subtitle: null, sort_order: 0, dishes: [dish('d1'), dish('d2')] },
  { id: 'c2', name: 'Drinks', subtitle: null, sort_order: 1, dishes: [dish('d3')] },
];

const menuKey = ['merchant-menu', 'r1'];

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const availabilityOf = (dishId: string): boolean | undefined =>
  queryClient
    .getQueryData<MerchantMenuCategory[]>(menuKey)
    ?.flatMap((category) => category.dishes)
    .find((entry) => entry.id === dishId)?.is_available;

beforeEach(() => {
  jest.clearAllMocks();
  resetSessionEpochForTests();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(menuKey, menu());
});

describe('flipping availability in a cached menu', () => {
  it('only touches the dish it was given', () => {
    const next = setAvailabilityInMenu(menu(), 'd2', false);

    expect(next[0].dishes.map((entry) => entry.is_available)).toEqual([true, false]);
    expect(next[1].dishes[0].is_available).toBe(true);
  });

  it('leaves an unknown dish id alone', () => {
    expect(setAvailabilityInMenu(menu(), 'nope', false)).toEqual(menu());
  });

  it('copes with an empty cache', () => {
    expect(setAvailabilityInMenu(undefined, 'd1', false)).toEqual([]);
  });

  it('replaces a whole dish with the row the server returned', () => {
    const served = dish('d1', { name: 'Renamed', price: 12.5, is_available: false });
    const next = replaceDishInMenu(menu(), served);

    expect(next[0].dishes[0]).toEqual(served);
    expect(next[0].dishes[1].name).toBe('Dish d2');
  });
});

describe('the availability switch', () => {
  it('flips the switch before the server answers', async () => {
    let resolve: ((value: Dish) => void) | undefined;
    mockSetDishAvailable.mockReturnValue(
      new Promise<Dish>((done) => {
        resolve = done;
      })
    );

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd1', isAvailable: false });
    });

    await waitFor(() => expect(availabilityOf('d1')).toBe(false));
    expect(mockSetDishAvailable).toHaveBeenCalledWith('d1', false);

    await act(async () => {
      resolve?.(dish('d1', { is_available: false }));
    });

    expect(availabilityOf('d1')).toBe(false);
  });

  it('puts the switch back when the server refuses', async () => {
    mockSetDishAvailable.mockRejectedValue(new Error('You do not manage this restaurant'));

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd1', isAvailable: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(availabilityOf('d1')).toBe(true);
    expect(availabilityOf('d2')).toBe(true);
  });

  it('keeps the rest of the menu intact through a rollback', async () => {
    mockSetDishAvailable.mockRejectedValue(new Error('nope'));

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd3', isAvailable: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<MerchantMenuCategory[]>(menuKey)).toEqual(menu());
  });

  it('adopts the server row on success', async () => {
    mockSetDishAvailable.mockResolvedValue(dish('d1', { name: 'Off menu', is_available: false }));

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd1', isAvailable: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient
      .getQueryData<MerchantMenuCategory[]>(menuKey)
      ?.flatMap((category) => category.dishes)
      .find((entry) => entry.id === 'd1');
    expect(cached?.name).toBe('Off menu');
    expect(cached?.is_available).toBe(false);
  });

  it('does not roll back into the next account cache', async () => {
    mockSetDishAvailable.mockImplementation(() => {
      bumpSessionEpoch();
      queryClient.setQueryData(menuKey, []);
      return Promise.reject(new Error('signed out'));
    });

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd1', isAvailable: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<MerchantMenuCategory[]>(menuKey)).toEqual([]);
  });

  it('refreshes the customer facing menu once it settles', async () => {
    mockSetDishAvailable.mockResolvedValue(dish('d1', { is_available: false }));
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSetDishAvailable('r1'), { wrapper });

    act(() => {
      result.current.mutate({ dishId: 'd1', isAvailable: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(['menu', 'r1']));
    expect(keys).toContain(JSON.stringify(['restaurant', 'r1']));
    expect(keys).toContain(JSON.stringify(['cart-validation']));
  });
});
