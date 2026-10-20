jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), dismiss: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ id: 'order-1' }),
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

const mockAuthState = { user: { id: 'user-1' }, isAnonymous: false, profile: null };

jest.mock('@/hooks/use-auth-store', () => ({
  __esModule: true,
  default: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => true, toggle: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-cartstore', () => ({
  useCartSummary: () => ({ totalItems: 0, total: 0 }),
  useCartStore: () => jest.fn(),
}));

jest.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: 'c1', name: 'Pizza', image_url: null, background_color: null, restaurant_count: 3 },
    ],
    isLoading: false,
  }),
}));

jest.mock('@/hooks/usePromotions', () => ({
  useActivePromotions: () => ({
    data: [
      {
        id: 'p1',
        code: 'WELCOME',
        description: 'Welcome offer',
        kind: 'percentage',
        value: 10,
        ends_at: null,
        restaurant_id: null,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-filters-store', () => ({
  useFilterStore: () => ({
    selectedCuisines: [],
    selectedPrice: null,
    enjoyPlusOnly: false,
    selectedSort: 'recommended',
  }),
}));

jest.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    restaurants: [
      {
        id: 'r1',
        name: 'Pizza Place',
        description: 'Tasty',
        image_url: null,
        rating: 4.5,
        review_count: 12,
        delivery_time_min: 15,
        delivery_time_max: 25,
        delivery_fee: 1.5,
        min_order: 10,
        is_open: true,
        cuisines: [],
        tags: [],
        opening_hours: null,
        address: 'Main street 1',
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  }),
  useRestaurant: () => ({
    data: {
      id: 'r1',
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

jest.mock('@/hooks/useMenu', () => ({
  useMenu: () => ({
    data: [
      {
        id: 'c1',
        name: 'Starters',
        subtitle: 'To begin',
        dishes: [
          {
            id: 'd1',
            name: 'Garlic bread',
            description: 'Warm',
            price: 4.5,
            image_url: null,
            is_popular: true,
            is_available: true,
            dietary_tags: [],
          },
        ],
      },
    ],
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useReviews', () => ({
  useReviewSummary: () => ({ data: { average_rating: 4.6, review_count: 12 } }),
  useMyReviews: () => ({ data: [{ order_id: 'o2', rating: 4 }] }),
}));

jest.mock('@/hooks/useOrderHistory', () => ({
  useOrderHistory: () => ({
    data: [
      {
        id: 'o1',
        status: 'preparing',
        delivery_mode: 'delivery',
        total: 22.5,
        created_at: '2026-02-01T10:00:00.000Z',
        restaurant: { name: 'Pizza Place' },
        order_items: [],
      },
      {
        id: 'o2',
        status: 'delivered',
        delivery_mode: 'pickup',
        total: 12,
        created_at: '2026-01-20T10:00:00.000Z',
        restaurant: { name: 'Sushi' },
        order_items: [],
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: 'n1',
        title: 'Order accepted',
        body: 'The restaurant is preparing your food',
        audience: 'customer',
        order_id: 'o1',
        read_at: null,
        created_at: '2026-02-01T10:00:00.000Z',
      },
    ],
    unreadCount: 1,
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
    markRead: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('@/hooks/useOrderChat', () => ({
  useOrderChat: () => ({
    access: { can_read: true, can_send: true, counterpart_name: 'Courier A', reason: 'open' },
    accessError: null,
    isAccessLoading: false,
    refetchAccess: jest.fn(),
    messages: [
      {
        id: 'm1',
        body: 'On my way',
        created_at: '2026-02-01T10:00:00.000Z',
        is_mine: false,
        client_message_id: 'client-m1',
      },
    ],
    outgoing: [
      {
        client_message_id: 'client-new',
        body: 'Thanks',
        state: 'failed',
        created_at: '2026-02-01T10:05:00.000Z',
      },
    ],
    canRead: true,
    canSend: true,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    loadOlder: jest.fn(),
    hasOlder: true,
    isLoadingOlder: false,
    isOlderError: false,
    connection: 'connected',
    send: jest.fn(),
    retry: jest.fn(),
    discard: jest.fn(),
    markRead: jest.fn(() => Promise.resolve()),
  }),
  mergeChatTimeline: jest.requireActual('@/hooks/useOrderChat').mergeChatTimeline,
}));

import MenuScreen from '@/app/(app)/(auth)/(modal)/(restaurant)/[id]';
import NotificationsScreen from '@/app/(app)/(auth)/notifications';
import ChatScreen from '@/app/(app)/(auth)/order/chat';
import OrderHistoryPage from '@/components/screens/OrderHistoryPage';
import RestaurantListPage from '@/components/screens/RestaurantListPage';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import {
  expectEveryPressableToBeNamed,
  pressableNames,
  unnamedPressables,
} from './helpers/accessibility';

const withQueries = (element: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
};

const screens: [string, () => ReactElement][] = [
  ['the restaurant feed', () => <RestaurantListPage title="Restaurants" />],
  ['the restaurant menu', () => <MenuScreen />],
  ['the order history', () => <OrderHistoryPage showBackButton />],
  ['the order chat', () => <ChatScreen />],
  ['the notifications', () => <NotificationsScreen />],
];

describe('every pressable on a key screen has a name', () => {
  it.each(screens)('%s', (_name, element) => {
    withQueries(element());

    expect(pressableNames().length).toBeGreaterThan(1);
    expectEveryPressableToBeNamed();
  });
});

describe('the helper', () => {
  it('actually finds the pressables it is checking', () => {
    withQueries(<RestaurantListPage title="Restaurants" />);

    expect(pressableNames().length).toBeGreaterThan(3);
    expect(unnamedPressables()).toEqual([]);
  });

  it('reports an icon button with no label', () => {
    render(
      <TouchableOpacity testID="mute" onPress={() => undefined}>
        <Ionicons name="volume-mute" size={20} />
      </TouchableOpacity>
    );

    expect(unnamedPressables()).toEqual(['mute']);
  });

  it('accepts a button that reads out its own text', () => {
    render(
      <TouchableOpacity onPress={() => undefined}>
        <Text>Place order</Text>
      </TouchableOpacity>
    );

    expect(unnamedPressables()).toEqual([]);
    expect(pressableNames()).toEqual(['Place order']);
  });

  it('accepts an icon button carrying a label', () => {
    render(
      <TouchableOpacity
        onPress={() => undefined}
        accessibilityRole="button"
        accessibilityLabel="Mute">
        <Ionicons name="volume-mute" size={20} />
      </TouchableOpacity>
    );

    expect(unnamedPressables()).toEqual([]);
    expect(pressableNames()).toEqual(['Mute']);
  });
});
