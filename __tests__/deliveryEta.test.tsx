jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/realtime').createRealtimeSupabaseMock(),
}));

const mockAuthState: { user: { id: string } | null } = { user: { id: 'user-a' } };

jest.mock('@/hooks/use-auth-store', () => ({
  __esModule: true,
  default: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(View, null, props.children);
  });
  return {
    __esModule: true,
    default: MapView,
    Marker: ({ children }: { children?: React.ReactNode }) => children ?? null,
    PROVIDER_DEFAULT: 'default',
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ data: { currency: 'EUR' } }),
}));

jest.mock('@/hooks/useOrderChat', () => ({
  useOrderChatAccess: () => ({ data: { can_read: false } }),
  useOrderChatUnreadTotals: () => ({ data: [] }),
}));

const mockGetOrderById = jest.fn();
const mockGetStatusHistory = jest.fn();
const mockGetDeliveryForOrder = jest.fn();
const mockGetTrackedCourier = jest.fn();
const mockListDeliveryLocations = jest.fn();

jest.mock('@/services/orderService', () => ({
  orderService: {
    getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
    getStatusHistory: (...args: unknown[]) => mockGetStatusHistory(...args),
  },
}));

jest.mock('@/services/courierService', () => ({
  courierService: {
    getDeliveryForOrder: (...args: unknown[]) => mockGetDeliveryForOrder(...args),
    getTrackedCourier: (...args: unknown[]) => mockGetTrackedCourier(...args),
    listDeliveryLocations: (...args: unknown[]) => mockListDeliveryLocations(...args),
  },
}));

import { EtaCard } from '@/components/EtaCard';
import TrackScreen from '@/app/(app)/(auth)/order/track';
import type { Order } from '@/types/database';
import {
  describeQuote,
  etaProgress,
  formatEtaWindow,
  minutesUntil,
  orderEta,
} from '@/utils/eta';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { findChannel, mockChannelRegistry, resetChannelRegistry } from './helpers/realtime';
import type { ReactElement } from 'react';

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const inMinutes = (minutes: number): string =>
  new Date(Date.now() + minutes * 60000).toISOString();

const soon = { at: inMinutes(45), from: inMinutes(40), to: inMinutes(50) };
const later = { at: inMinutes(65), from: inMinutes(60), to: inMinutes(70) };

const order = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 'order-1',
    user_id: 'user-a',
    restaurant_id: 'restaurant-1',
    status: 'delivering',
    delivery_mode: 'delivery',
    address_id: null,
    scheduled_for: null,
    subtotal: 20,
    service_fee: 1,
    delivery_fee: 1.5,
    tip_amount: 0,
    total: 22.5,
    payment_method: 'cash',
    leave_at_door: false,
    send_as_gift: false,
    idempotency_key: null,
    eta_at: null,
    eta_min_at: null,
    eta_max_at: null,
    eta_updated_at: null,
    created_at: '2026-04-01T17:00:00.000Z',
    updated_at: '2026-04-01T17:00:00.000Z',
    ...overrides,
  }) as Order;

let queryClient: QueryClient;

const renderWithQueries = (element: ReactElement) => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
};

const connectAll = async () => {
  await act(async () => {
    mockChannelRegistry.forEach((channel) => channel.statusCallback?.('SUBSCRIBED'));
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetChannelRegistry();
  mockAuthState.user = { id: 'user-a' };
  mockGetStatusHistory.mockResolvedValue([]);
  mockGetDeliveryForOrder.mockResolvedValue({
    id: 'delivery-1',
    order_id: 'order-1',
    status: 'delivering',
    eta_at: null,
  });
  mockGetTrackedCourier.mockResolvedValue(null);
  mockListDeliveryLocations.mockResolvedValue([]);
});

describe('reading an estimate off an order', () => {
  it('reads a window as a pair of clock times', () => {
    expect(
      formatEtaWindow('2026-04-01T17:40:00.000Z', '2026-04-01T17:50:00.000Z')
    ).toBe(`${clock('2026-04-01T17:40:00.000Z')}–${clock('2026-04-01T17:50:00.000Z')}`);
  });

  it('collapses a window that opens and closes at the same minute', () => {
    expect(formatEtaWindow('2026-04-01T17:40:00.000Z', '2026-04-01T17:40:30.000Z')).toBe(
      clock('2026-04-01T17:40:00.000Z')
    );
  });

  it('copes with only one end of the window', () => {
    expect(formatEtaWindow('2026-04-01T17:40:00.000Z', null)).toBe(
      clock('2026-04-01T17:40:00.000Z')
    );
    expect(formatEtaWindow(null, null)).toBeNull();
  });

  it('counts the minutes left', () => {
    const now = new Date('2026-04-01T17:00:00.000Z').getTime();

    expect(minutesUntil('2026-04-01T17:35:00.000Z', now)).toBe(35);
    expect(minutesUntil('2026-04-01T16:50:00.000Z', now)).toBe(-10);
    expect(minutesUntil(null, now)).toBeNull();
    expect(minutesUntil('not a date', now)).toBeNull();
  });

  it('grows the progress as the order moves along', () => {
    expect(etaProgress('placed')).toBeLessThan(etaProgress('preparing'));
    expect(etaProgress('preparing')).toBeLessThan(etaProgress('picked_up'));
    expect(etaProgress('picked_up')).toBeLessThan(etaProgress('delivered'));
    expect(etaProgress('delivered')).toBe(1);
    expect(etaProgress(undefined)).toBe(0);
    expect(etaProgress('cancelled')).toBe(0);
  });

  it('calls an order late once the window has closed', () => {
    const now = new Date('2026-04-01T18:00:00.000Z').getTime();
    const eta = orderEta(
      order({ eta_at: '2026-04-01T17:40:00.000Z', eta_max_at: '2026-04-01T17:50:00.000Z' }),
      now
    );

    expect(eta.isLate).toBe(true);
  });

  it('is not late while the window is still open', () => {
    const now = new Date('2026-04-01T17:45:00.000Z').getTime();
    const eta = orderEta(
      order({ eta_at: '2026-04-01T17:40:00.000Z', eta_max_at: '2026-04-01T17:50:00.000Z' }),
      now
    );

    expect(eta.isLate).toBe(false);
  });

  it('describes a quote as a range of minutes', () => {
    expect(describeQuote(30, 40)).toBe('30–40 min');
    expect(describeQuote(30, 30)).toBe('30 min');
    expect(describeQuote(null, 40)).toBeNull();
  });
});

describe('the estimate card', () => {
  it('shows the window it was given', () => {
    render(
      <EtaCard
        order={order({ eta_at: soon.at, eta_min_at: soon.from, eta_max_at: soon.to })}
      />
    );

    expect(screen.getByTestId('eta-window')).toHaveTextContent(new RegExp(clock(soon.from)));
    expect(screen.getByTestId('eta-window')).toHaveTextContent(/Arriving/);
  });

  it('says nothing at all without an estimate', () => {
    render(<EtaCard order={order()} />);

    expect(screen.queryByTestId('eta-card')).toBeNull();
  });

  it('stays out of the way once the order is closed', () => {
    render(
      <EtaCard
        order={order({ status: 'delivered', eta_min_at: soon.from, eta_max_at: soon.to })}
        isTerminal
      />
    );

    expect(screen.queryByTestId('eta-card')).toBeNull();
  });

  it('reports the progress for a screen reader', () => {
    render(
      <EtaCard
        order={order({ status: 'picked_up', eta_min_at: soon.from, eta_max_at: soon.to })}
      />
    );

    expect(screen.getByTestId('eta-progress').props.accessibilityValue.now).toBe(80);
  });
});

describe('the tracking screen', () => {
  it('shows the stored estimate', async () => {
    mockGetOrderById.mockResolvedValue(
      order({ eta_at: soon.at, eta_min_at: soon.from, eta_max_at: soon.to })
    );

    renderWithQueries(<TrackScreen />);
    await connectAll();

    expect(await screen.findByTestId('eta-window')).toHaveTextContent(
      new RegExp(clock(soon.from))
    );
  });

  it('moves the estimate when a realtime order change arrives', async () => {
    mockGetOrderById.mockResolvedValue(
      order({ eta_at: soon.at, eta_min_at: soon.from, eta_max_at: soon.to })
    );

    renderWithQueries(<TrackScreen />);
    await connectAll();
    await screen.findByTestId('eta-window');

    mockGetOrderById.mockResolvedValue(
      order({ eta_at: later.at, eta_min_at: later.from, eta_max_at: later.to })
    );

    const channel = findChannel('track-order-');
    expect(channel).toBeDefined();

    await act(async () => {
      channel?.handlers.forEach((handler) =>
        handler({ eventType: 'UPDATE', new: { id: 'order-1' } })
      );
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('eta-window')).toHaveTextContent(new RegExp(clock(later.from)))
    );
    expect(screen.getByTestId('eta-window')).not.toHaveTextContent(
      new RegExp(clock(soon.from))
    );
  });

  it('does not poll for the estimate', async () => {
    mockGetOrderById.mockResolvedValue(
      order({ eta_at: soon.at, eta_min_at: soon.from, eta_max_at: soon.to })
    );

    renderWithQueries(<TrackScreen />);
    await connectAll();
    await screen.findByTestId('eta-window');

    const callsAfterFirstRender = mockGetOrderById.mock.calls.length;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(mockGetOrderById.mock.calls.length).toBe(callsAfterFirstRender);
  });
});
