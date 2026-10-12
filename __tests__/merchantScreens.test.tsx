jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockParams: { id?: string; restaurant?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

const mockAuthState = { user: { id: 'user-1' } };

jest.mock('@/hooks/use-auth-store', () => ({
  __esModule: true,
  default: Object.assign(
    (selector?: (state: typeof mockAuthState) => unknown) =>
      selector ? selector(mockAuthState) : mockAuthState,
    { getState: () => mockAuthState }
  ),
}));

const mockListManaged = jest.fn();
const mockMenu = jest.fn();
const mockSetDishAvailable = jest.fn();
const mockUpdateDish = jest.fn();
const mockListHours = jest.fn();
const mockSetHours = jest.fn();
const mockSetStorePaused = jest.fn();
const mockSetPrepTime = jest.fn();

jest.mock('@/services/merchantService', () => ({
  merchantService: {
    listManagedRestaurants: (...args: unknown[]) => mockListManaged(...args),
    menu: (...args: unknown[]) => mockMenu(...args),
    setDishAvailable: (...args: unknown[]) => mockSetDishAvailable(...args),
    updateDish: (...args: unknown[]) => mockUpdateDish(...args),
    listHours: (...args: unknown[]) => mockListHours(...args),
    setHours: (...args: unknown[]) => mockSetHours(...args),
    setStorePaused: (...args: unknown[]) => mockSetStorePaused(...args),
    setPrepTime: (...args: unknown[]) => mockSetPrepTime(...args),
  },
}));

import DishScreen from '@/app/(app)/(auth)/merchant/dish';
import HoursScreen, { weekFromRows, weekProblem, weekToRanges } from '@/app/(app)/(auth)/merchant/hours';
import MenuScreen from '@/app/(app)/(auth)/merchant/menu';
import StoreScreen, { describePause, endOfDay, pauseUntil } from '@/app/(app)/(auth)/merchant/store';
import type { Dish, MerchantMenuCategory, Restaurant } from '@/types/database';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { expectEveryPressableToBeNamed } from './helpers/accessibility';

const restaurant = (overrides: Partial<Restaurant> = {}): Restaurant =>
  ({
    id: 'r1',
    name: 'Pizza Place',
    description: 'Tasty',
    image_url: null,
    rating: 4.5,
    review_count: 10,
    delivery_time_min: 15,
    delivery_time_max: 30,
    delivery_fee: 1.5,
    min_order: 10,
    address: 'Main street 1',
    latitude: null,
    longitude: null,
    is_open: true,
    cuisines: [],
    tags: [],
    opening_hours: null,
    timezone: null,
    is_paused: false,
    paused_until: null,
    avg_prep_minutes: 20,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Restaurant;

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
  { id: 'c1', name: 'Mains', subtitle: 'Hot food', sort_order: 0, dishes: [dish('d1'), dish('d2')] },
];

let queryClient: QueryClient;
let serverMenu: MerchantMenuCategory[];

const renderScreen = (element: ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.id = undefined;
  mockParams.restaurant = undefined;
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mockListManaged.mockResolvedValue([restaurant()]);
  serverMenu = menu();
  mockMenu.mockImplementation(() => Promise.resolve(JSON.parse(JSON.stringify(serverMenu))));
  mockListHours.mockResolvedValue([]);
  mockSetDishAvailable.mockImplementation((id: string, isAvailable: boolean) => {
    serverMenu = serverMenu.map((category) => ({
      ...category,
      dishes: category.dishes.map((entry) =>
        entry.id === id ? { ...entry, is_available: isAvailable } : entry
      ),
    }));
    return Promise.resolve(dish(id, { is_available: isAvailable }));
  });
  mockSetHours.mockResolvedValue([]);
  mockSetStorePaused.mockImplementation((_id: string, paused: boolean, until: string | null) =>
    Promise.resolve(restaurant({ is_paused: paused, paused_until: until }))
  );
  mockSetPrepTime.mockImplementation((_id: string, minutes: number) =>
    Promise.resolve(restaurant({ avg_prep_minutes: minutes }))
  );
  mockUpdateDish.mockImplementation((id: string) => Promise.resolve(dish(id)));
});

describe('the merchant menu screen', () => {
  it('lists each category with its dishes', async () => {
    renderScreen(<MenuScreen />);

    expect(await screen.findByText('Mains')).toBeTruthy();
    expect(screen.getByText('2 dishes')).toBeTruthy();
    expect(screen.getByTestId('merchant-dish-d1')).toBeTruthy();
    expect(screen.getByTestId('merchant-dish-d2')).toBeTruthy();
  });

  it('takes a dish off the menu through the switch', async () => {
    renderScreen(<MenuScreen />);

    fireEvent(await screen.findByTestId('merchant-dish-switch-d1'), 'valueChange', false);

    await waitFor(() => expect(mockSetDishAvailable).toHaveBeenCalledWith('d1', false));
    expect(screen.getByTestId('merchant-dish-switch-d1').props.value).toBe(false);
  });

  it('puts the switch back and says so when the server refuses', async () => {
    mockSetDishAvailable.mockRejectedValue(new Error('You do not manage this restaurant'));

    renderScreen(<MenuScreen />);

    fireEvent(await screen.findByTestId('merchant-dish-switch-d1'), 'valueChange', false);

    expect(await screen.findByTestId('merchant-dish-error-d1')).toBeTruthy();
    expect(screen.getByTestId('merchant-dish-switch-d1').props.value).toBe(true);
  });

  it('leaves the other dishes alone when one fails', async () => {
    mockSetDishAvailable.mockRejectedValue(new Error('nope'));

    renderScreen(<MenuScreen />);

    fireEvent(await screen.findByTestId('merchant-dish-switch-d1'), 'valueChange', false);

    await screen.findByTestId('merchant-dish-error-d1');
    expect(screen.getByTestId('merchant-dish-switch-d2').props.value).toBe(true);
    expect(screen.queryByTestId('merchant-dish-error-d2')).toBeNull();
  });

  it('opens the dish form for the dish that was tapped', async () => {
    renderScreen(<MenuScreen />);

    fireEvent.press(await screen.findByTestId('merchant-dish-edit-d2'));

    expect(mockPush).toHaveBeenCalledWith('/merchant/dish?id=d2&restaurant=r1');
  });

  it('names every control', async () => {
    renderScreen(<MenuScreen />);
    await screen.findByTestId('merchant-dish-d1');

    expectEveryPressableToBeNamed();
  });
});

describe('the dish form', () => {
  beforeEach(() => {
    mockParams.id = 'd1';
    mockParams.restaurant = 'r1';
  });

  it('starts from the stored dish', async () => {
    renderScreen(<DishScreen />);

    expect((await screen.findByTestId('dish-name')).props.value).toBe('Dish d1');
    expect(screen.getByTestId('dish-price').props.value).toBe('10.00');
  });

  it('refuses to save a price of zero', async () => {
    renderScreen(<DishScreen />);

    fireEvent.changeText(await screen.findByTestId('dish-price'), '0');
    fireEvent.press(screen.getByTestId('dish-save'));

    expect(mockUpdateDish).not.toHaveBeenCalled();
    expect(screen.getByText('A price has to be more than zero.')).toBeTruthy();
  });

  it('refuses to save without a name', async () => {
    renderScreen(<DishScreen />);

    fireEvent.changeText(await screen.findByTestId('dish-name'), '   ');
    fireEvent.press(screen.getByTestId('dish-save'));

    expect(mockUpdateDish).not.toHaveBeenCalled();
    expect(screen.getByText('A dish needs a name.')).toBeTruthy();
  });

  it('sends the edit and goes back', async () => {
    renderScreen(<DishScreen />);

    fireEvent.changeText(await screen.findByTestId('dish-name'), 'Pasta al pesto');
    fireEvent.changeText(screen.getByTestId('dish-price'), '13,50');
    fireEvent(screen.getByTestId('dish-popular'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('dish-save'));

    await waitFor(() =>
      expect(mockUpdateDish).toHaveBeenCalledWith('d1', {
        name: 'Pasta al pesto',
        description: 'Tasty',
        price: 13.5,
        isAvailable: true,
        isPopular: true,
      })
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows what the server said when the edit is refused', async () => {
    mockUpdateDish.mockRejectedValue(new Error('A price must be greater than zero'));

    renderScreen(<DishScreen />);

    fireEvent.press(await screen.findByTestId('dish-save'));

    expect(await screen.findByTestId('dish-save-error')).toHaveTextContent(
      /A price must be greater than zero/
    );
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('reading a week of opening hours', () => {
  it('turns stored rows into a week', () => {
    const week = weekFromRows([
      { day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' },
      { day_of_week: 5, opens_at: '10:00:00', closes_at: '23:00:00' },
    ]);

    expect(week[1]).toEqual({ isOpen: true, opensAt: '09:00', closesAt: '17:00' });
    expect(week[5]).toEqual({ isOpen: true, opensAt: '10:00', closesAt: '23:00' });
    expect(week[0].isOpen).toBe(false);
  });

  it('keeps the first range of a day with several', () => {
    const week = weekFromRows([
      { day_of_week: 2, opens_at: '09:00:00', closes_at: '12:00:00' },
      { day_of_week: 2, opens_at: '18:00:00', closes_at: '22:00:00' },
    ]);

    expect(week[2].opensAt).toBe('09:00');
  });

  it('sends only the days that are switched on', () => {
    const week = weekFromRows([{ day_of_week: 3, opens_at: '08:00:00', closes_at: '16:00:00' }]);

    expect(weekToRanges(week)).toEqual([
      { day_of_week: 3, opens_at: '08:00', closes_at: '16:00' },
    ]);
  });

  it('refuses a time that is not a time', () => {
    const week = weekFromRows([{ day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' }]);
    week[1].closesAt = '25:00';

    expect(weekProblem(week)).toMatch(/09:00/);
  });

  it('refuses a closing time equal to its opening time', () => {
    const week = weekFromRows([{ day_of_week: 1, opens_at: '09:00:00', closes_at: '09:00:00' }]);

    expect(weekProblem(week)).toMatch(/differ/);
  });

  it('accepts a range that runs past midnight', () => {
    const week = weekFromRows([{ day_of_week: 1, opens_at: '18:00:00', closes_at: '02:00:00' }]);

    expect(weekProblem(week)).toBeNull();
  });
});

describe('the hours screen', () => {
  it('saves the days that are switched on', async () => {
    mockListHours.mockResolvedValue([
      { id: 'h1', restaurant_id: 'r1', day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' },
    ]);

    renderScreen(<HoursScreen />);

    fireEvent.press(await screen.findByTestId('hours-save'));

    await waitFor(() =>
      expect(mockSetHours).toHaveBeenCalledWith('r1', [
        { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
      ])
    );
    expect(await screen.findByTestId('hours-saved')).toBeTruthy();
  });

  it('will not save a broken time', async () => {
    mockListHours.mockResolvedValue([
      { id: 'h1', restaurant_id: 'r1', day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' },
    ]);

    renderScreen(<HoursScreen />);

    fireEvent.changeText(await screen.findByTestId('hours-closes-1'), '99:99');
    fireEvent.press(screen.getByTestId('hours-save'));

    expect(screen.getByTestId('hours-problem')).toBeTruthy();
    expect(mockSetHours).not.toHaveBeenCalled();
  });

  it('clears a day that is switched off', async () => {
    mockListHours.mockResolvedValue([
      { id: 'h1', restaurant_id: 'r1', day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' },
    ]);

    renderScreen(<HoursScreen />);

    fireEvent(await screen.findByTestId('hours-open-1'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('hours-save'));

    await waitFor(() => expect(mockSetHours).toHaveBeenCalledWith('r1', []));
  });
});

describe('working out how long to pause', () => {
  const now = new Date('2026-03-10T14:00:00.000Z');

  it('pauses for half an hour', () => {
    expect(pauseUntil('thirty', now)).toBe('2026-03-10T14:30:00.000Z');
  });

  it('pauses for an hour', () => {
    expect(pauseUntil('hour', now)).toBe('2026-03-10T15:00:00.000Z');
  });

  it('pauses until the end of the local day', () => {
    expect(pauseUntil('day', now)).toBe(endOfDay(now).toISOString());
  });

  it('never asks for a pause that has already ended', () => {
    const lateAtNight = new Date(endOfDay(now).getTime() + 30 * 1000);

    expect(new Date(pauseUntil('day', lateAtNight)).getTime()).toBeGreaterThan(
      lateAtNight.getTime()
    );
  });

  it('describes a store that is taking orders', () => {
    expect(describePause(restaurant(), now)).toBe('Taking orders');
  });

  it('describes a pause with no end', () => {
    expect(describePause(restaurant({ is_paused: true }), now)).toMatch(/until you resume/);
  });

  it('treats a pause that has run out as open', () => {
    const expired = restaurant({ is_paused: true, paused_until: '2026-03-10T13:00:00.000Z' });

    expect(describePause(expired, now)).toBe('Taking orders');
  });
});

describe('the store status screen', () => {
  it('offers the three pause lengths while the store is open', async () => {
    renderScreen(<StoreScreen />);

    expect(await screen.findByTestId('store-pause-thirty')).toBeTruthy();
    expect(screen.getByTestId('store-pause-hour')).toBeTruthy();
    expect(screen.getByTestId('store-pause-day')).toBeTruthy();
    expect(screen.queryByTestId('store-resume')).toBeNull();
  });

  it('pauses for half an hour', async () => {
    renderScreen(<StoreScreen />);

    fireEvent.press(await screen.findByTestId('store-pause-thirty'));

    await waitFor(() => expect(mockSetStorePaused).toHaveBeenCalled());
    const [restaurantId, paused, until] = mockSetStorePaused.mock.calls[0];
    expect(restaurantId).toBe('r1');
    expect(paused).toBe(true);
    expect(new Date(until as string).getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
  });

  it('offers a resume once the store is paused', async () => {
    mockListManaged.mockResolvedValue([
      restaurant({ is_paused: true, paused_until: null }),
    ]);

    renderScreen(<StoreScreen />);

    fireEvent.press(await screen.findByTestId('store-resume'));

    await waitFor(() => expect(mockSetStorePaused).toHaveBeenCalledWith('r1', false, null));
  });

  it('reports what the server said when a pause is refused', async () => {
    mockSetStorePaused.mockRejectedValue(new Error('A pause lasts at most 7 days'));

    renderScreen(<StoreScreen />);

    fireEvent.press(await screen.findByTestId('store-pause-hour'));

    expect(await screen.findByTestId('store-error')).toHaveTextContent(/at most 7 days/);
  });

  it('sets the preparation time', async () => {
    renderScreen(<StoreScreen />);

    fireEvent.press(await screen.findByTestId('store-prep-45'));

    await waitFor(() => expect(mockSetPrepTime).toHaveBeenCalledWith('r1', 45));
  });

  it('marks the stored preparation time as selected', async () => {
    mockListManaged.mockResolvedValue([restaurant({ avg_prep_minutes: 30 })]);

    renderScreen(<StoreScreen />);

    expect((await screen.findByTestId('store-prep-30')).props.accessibilityState.selected).toBe(
      true
    );
    expect(screen.getByTestId('store-prep-45').props.accessibilityState.selected).toBe(false);
  });

  it('names every control', async () => {
    renderScreen(<StoreScreen />);
    await screen.findByTestId('store-prep-20');

    expectEveryPressableToBeNamed();
  });
});

describe('a user who manages nothing', () => {
  it('is told to ask an administrator', async () => {
    mockListManaged.mockResolvedValue([]);

    renderScreen(<MenuScreen />);

    expect(await screen.findByText('No restaurant linked')).toBeTruthy();
    expect(screen.queryByTestId('merchant-menu-list')).toBeNull();
  });
});
