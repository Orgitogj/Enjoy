jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

const mockHistory: {
  data: unknown[] | undefined;
  isLoading: boolean;
  error: unknown;
  isRefetching: boolean;
} = { data: [], isLoading: false, error: null, isRefetching: false };

const mockRefetch = jest.fn();
const mockReviews: { data: unknown[] } = { data: [] };

jest.mock('@/hooks/useOrderHistory', () => ({
  useOrderHistory: () => ({ ...mockHistory, refetch: mockRefetch }),
}));

jest.mock('@/hooks/useReviews', () => ({
  useMyReviews: () => mockReviews,
}));

import OrderHistoryPage from '@/components/screens/OrderHistoryPage';
import type { OrderStatus, OrderWithItems } from '@/types/database';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

const order = (id: string, status: OrderStatus, name: string): OrderWithItems =>
  ({
    id,
    user_id: 'user-1',
    restaurant_id: 'restaurant-1',
    status,
    delivery_mode: 'delivery',
    address_id: null,
    scheduled_for: null,
    subtotal: 20,
    service_fee: 1,
    delivery_fee: 1.5,
    tip_amount: 0,
    total: 22.5,
    payment_method: 'card',
    leave_at_door: false,
    send_as_gift: false,
    idempotency_key: null,
    eta_at: null,
    eta_min_at: null,
    eta_max_at: null,
    eta_updated_at: null,
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    restaurant: { id: 'restaurant-1', name } as OrderWithItems['restaurant'],
    order_items: [],
  }) as OrderWithItems;

beforeEach(() => {
  jest.clearAllMocks();
  mockHistory.data = [];
  mockHistory.isLoading = false;
  mockHistory.error = null;
  mockHistory.isRefetching = false;
  mockReviews.data = [];
});

describe('the order history list', () => {
  it('groups live orders above finished ones', () => {
    mockHistory.data = [order('o1', 'preparing', 'Pizza Place'), order('o2', 'delivered', 'Sushi')];

    render(<OrderHistoryPage />);

    const list = within(screen.getByTestId('orders-list'));

    expect(list.getByText('In progress')).toBeTruthy();
    expect(list.getByText('Past orders')).toBeTruthy();
    expect(screen.getByTestId('order-row-o1')).toBeTruthy();
    expect(screen.getByTestId('order-row-o2')).toBeTruthy();
  });

  it('leaves out a section with no orders in it', () => {
    mockHistory.data = [order('o1', 'preparing', 'Pizza Place')];

    render(<OrderHistoryPage />);

    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.queryByText('Past orders')).toBeNull();
  });

  it('opens tracking for the order that was tapped', () => {
    mockHistory.data = [order('o1', 'preparing', 'Pizza Place')];

    render(<OrderHistoryPage />);
    fireEvent.press(screen.getByTestId('order-row-o1'));

    expect(mockPush).toHaveBeenCalledWith('/order/track?id=o1');
  });

  it('offers a review action only once an order is delivered', () => {
    mockHistory.data = [order('o1', 'preparing', 'Pizza Place'), order('o2', 'delivered', 'Sushi')];

    render(<OrderHistoryPage />);

    expect(screen.queryByTestId('rate-order-o1')).toBeNull();
    expect(screen.getByTestId('rate-order-o2')).toBeTruthy();
  });

  it('switches to editing once a review exists', () => {
    mockHistory.data = [order('o2', 'delivered', 'Sushi')];
    mockReviews.data = [{ order_id: 'o2', rating: 4 }];

    render(<OrderHistoryPage />);

    expect(screen.getByTestId('edit-review-o2')).toBeTruthy();
    expect(screen.queryByTestId('rate-order-o2')).toBeNull();
  });

  it('refreshes on pull', () => {
    mockHistory.data = [order('o1', 'preparing', 'Pizza Place')];

    render(<OrderHistoryPage />);
    fireEvent(screen.getByTestId('orders-list'), 'refresh');

    expect(mockRefetch).toHaveBeenCalled();
  });
});

describe('the order history states', () => {
  it('shows a spinner on the first load', () => {
    mockHistory.isLoading = true;

    render(<OrderHistoryPage />);

    expect(screen.getByTestId('orders-loading')).toBeTruthy();
    expect(screen.queryByTestId('orders-list')).toBeNull();
  });

  it('offers a retry when the query failed', () => {
    mockHistory.error = new Error('network down');

    render(<OrderHistoryPage />);
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.queryByText('network down')).toBeNull();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('points a new customer at the restaurants', () => {
    render(<OrderHistoryPage />);
    fireEvent.press(screen.getByText('Browse restaurants'));

    expect(screen.getByText('No orders yet')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/restaurants');
  });
});
