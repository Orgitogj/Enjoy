jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockScrollToIndex = jest.fn();

jest.mock('@shopify/flash-list', () => {
  const actual = jest.requireActual('@shopify/flash-list');
  const React = require('react') as typeof import('react');

  const FlashList = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      const innerRef = React.useRef<Record<string, unknown> | null>(null);
      React.useImperativeHandle(ref, () => ({
        ...(innerRef.current ?? {}),
        scrollToIndex: mockScrollToIndex,
      }));
      return React.createElement(actual.FlashList, { ...props, ref: innerRef });
    }
  );

  return { ...actual, FlashList };
});

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'restaurant-1' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggle: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-cartstore', () => ({
  useCartSummary: () => ({ totalItems: 0, total: 0 }),
  useCartStore: () => jest.fn(),
}));

jest.mock('@/hooks/useReviews', () => ({
  useReviewSummary: () => ({ data: null }),
}));

const mockMenu: { data: unknown; isLoading: boolean } = { data: [], isLoading: false };

jest.mock('@/hooks/useMenu', () => ({
  useMenu: () => mockMenu,
}));

jest.mock('@/hooks/useRestaurants', () => ({
  useRestaurant: () => ({
    data: {
      id: 'restaurant-1',
      name: 'Pizza Place',
      image_url: null,
      rating: 4.6,
      min_order: 10,
      delivery_fee: 1.5,
      delivery_time_min: 15,
      delivery_time_max: 25,
      is_open: true,
      opening_hours: null,
      address: 'Main street 1',
    },
    isLoading: false,
  }),
}));

import MenuScreen from '@/app/(app)/(auth)/(modal)/(restaurant)/[id]';
import type { Dish, MenuCategoryWithDishes } from '@/types/database';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

const dish = (id: string, name: string, overrides: Partial<Dish> = {}): Dish =>
  ({
    id,
    restaurant_id: 'restaurant-1',
    menu_category_id: 'category-1',
    name,
    description: 'Very tasty',
    price: 9.5,
    image_url: null,
    is_popular: false,
    is_available: true,
    dietary_tags: [],
    sort_order: 0,
    ...overrides,
  }) as Dish;

const category = (
  id: string,
  name: string,
  dishes: Dish[],
  subtitle: string | null = null
): MenuCategoryWithDishes =>
  ({
    id,
    restaurant_id: 'restaurant-1',
    name,
    subtitle,
    sort_order: 0,
    dishes,
  }) as MenuCategoryWithDishes;

beforeEach(() => {
  jest.clearAllMocks();
  mockMenu.data = [
    category('c1', 'Starters', [dish('d1', 'Garlic bread'), dish('d2', 'Olives')], 'To begin'),
    category('c2', 'Pizzas', [dish('d3', 'Margherita')]),
  ];
  mockMenu.isLoading = false;
});

describe('the menu list', () => {
  it('renders a header row and its dishes for every category', () => {
    render(<MenuScreen />);

    const list = within(screen.getByTestId('menu-list'));

    expect(list.getByText('Starters')).toBeTruthy();
    expect(list.getByText('To begin')).toBeTruthy();
    expect(list.getByText('Garlic bread')).toBeTruthy();
    expect(list.getByText('Olives')).toBeTruthy();
    expect(list.getByText('Pizzas')).toBeTruthy();
    expect(list.getByText('Margherita')).toBeTruthy();
  });

  it('offers one tab per category next to the list', () => {
    render(<MenuScreen />);

    expect(screen.getByTestId('menu-category-0')).toBeTruthy();
    expect(screen.getByTestId('menu-category-1')).toBeTruthy();
    expect(screen.queryByTestId('menu-category-2')).toBeNull();
  });

  it('shows the empty state when nothing matches the search', () => {
    render(<MenuScreen />);

    fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'sushi');

    expect(screen.getByText('No dishes match your search')).toBeTruthy();
    expect(screen.queryByText('Garlic bread')).toBeNull();
  });

  it('keeps only the categories that still have a match', () => {
    render(<MenuScreen />);

    fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'margherita');

    expect(screen.getByText('Margherita')).toBeTruthy();
    expect(screen.queryByText('Garlic bread')).toBeNull();
    expect(screen.queryByText('Starters')).toBeNull();
  });
});

describe('jumping to a category', () => {
  it('scrolls to the row that holds the category header', () => {
    render(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-category-1'));

    expect(mockScrollToIndex).toHaveBeenCalledWith(
      expect.objectContaining({ index: 3, animated: true })
    );
  });

  it('leaves room above the header for the sticky tabs', () => {
    render(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-category-1'));

    expect(mockScrollToIndex.mock.calls[0][0].viewOffset).toBe(-120);
  });

  it('scrolls to the first row for the first category', () => {
    render(<MenuScreen />);

    fireEvent.press(screen.getByTestId('menu-category-0'));

    expect(mockScrollToIndex).toHaveBeenCalledWith(expect.objectContaining({ index: 0 }));
  });
});
