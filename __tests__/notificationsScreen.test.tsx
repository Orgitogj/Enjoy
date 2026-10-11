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

const mockMarkRead = jest.fn(() => Promise.resolve());
const mockRefetch = jest.fn();

const mockState: {
  notifications: unknown[];
  unreadCount: number;
  isLoading: boolean;
  isRefetching: boolean;
} = { notifications: [], unreadCount: 0, isLoading: false, isRefetching: false };

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    ...mockState,
    refetch: mockRefetch,
    markRead: mockMarkRead,
  }),
}));

import NotificationsScreen from '@/app/(app)/(auth)/notifications';
import type { AppNotification } from '@/types/database';
import { fireEvent, render, screen } from '@testing-library/react-native';

const notification = (
  id: string,
  overrides: Partial<AppNotification> = {}
): AppNotification =>
  ({
    id,
    user_id: 'user-1',
    order_id: 'order-1',
    delivery_id: null,
    audience: 'customer',
    kind: 'order_update',
    title: `Title ${id}`,
    body: `Body ${id}`,
    data: {},
    read_at: null,
    pushed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }) as AppNotification;

beforeEach(() => {
  jest.clearAllMocks();
  mockState.notifications = [];
  mockState.unreadCount = 0;
  mockState.isLoading = false;
  mockState.isRefetching = false;
});

describe('the notifications list', () => {
  it('renders a row per notification', () => {
    mockState.notifications = [notification('n1'), notification('n2')];

    render(<NotificationsScreen />);

    expect(screen.getByText('Title n1')).toBeTruthy();
    expect(screen.getByText('Body n2')).toBeTruthy();
  });

  it('opens the order a notification points at', () => {
    mockState.notifications = [notification('n1', { order_id: 'order-9' })];

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByText('Title n1'));

    expect(mockPush).toHaveBeenCalledWith('/order/track?id=order-9');
  });

  it('does not navigate from a notification without an order', () => {
    mockState.notifications = [notification('n1', { order_id: null })];

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByText('Title n1'));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('marks everything read once there is something unread', () => {
    mockState.notifications = [notification('n1')];
    mockState.unreadCount = 1;

    render(<NotificationsScreen />);

    expect(mockMarkRead).toHaveBeenCalledWith(undefined);
  });

  it('shows the empty state with nothing to read', () => {
    render(<NotificationsScreen />);

    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });

  it('shows a spinner instead of the list while loading', () => {
    mockState.isLoading = true;

    render(<NotificationsScreen />);

    expect(screen.queryByTestId('notifications-list')).toBeNull();
  });
});
