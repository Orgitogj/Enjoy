jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockMotion = { reduce: false };
jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockMotion.reduce,
}));

const mockRouter = { dismiss: jest.fn(), back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'dish-1' }),
}));

const mockDish = {
  id: 'dish-1',
  restaurant_id: 'restaurant-1',
  name: 'Margherita',
  description: 'Tomato, mozzarella, basil',
  price: 9.5,
  image_url: null,
  is_popular: false,
  dietary_tags: [],
  addons: [],
};
jest.mock('@/hooks/useMenu', () => ({
  useDish: () => ({ data: mockDish, isLoading: false }),
}));
jest.mock('@/hooks/useRestaurants', () => ({
  useRestaurant: () => ({ data: { id: 'restaurant-1', name: 'Pizza Place' } }),
}));

import DishSheet from '@/app/(app)/(auth)/(modal)/(menu)/[id]';
import { entranceDelayFor } from '@/components/RestaurantCard';
import CountBadge from '@/components/ui/CountBadge';
import PressableScale from '@/components/ui/PressableScale';
import { useCartStore } from '@/hooks/use-cartstore';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMotion.reduce = false;
  useCartStore.getState().clearCart();
});

describe('PressableScale', () => {
  it.each([false, true])('fires onPress immediately (reduce motion: %s)', (reduce) => {
    mockMotion.reduce = reduce;
    const onPress = jest.fn();
    render(
      <PressableScale onPress={onPress} accessibilityRole="button">
        <Text>Pay</Text>
      </PressableScale>
    );
    fireEvent.press(screen.getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes and enforces the disabled state', () => {
    const onPress = jest.fn();
    render(
      <PressableScale onPress={onPress} disabled accessibilityRole="button">
        <Text>Pay</Text>
      </PressableScale>
    );
    const button = screen.getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('CountBadge', () => {
  const hidden = { includeHiddenElements: true };

  it('always shows the real count, whether it rises or falls', () => {
    const view = render(<CountBadge count={1} />);
    view.rerender(<CountBadge count={3} />);
    expect(screen.getByText('3', hidden)).toBeTruthy();
    view.rerender(<CountBadge count={2} />);
    expect(screen.getByText('2', hidden)).toBeTruthy();
    expect(screen.queryByText('2')).toBeNull();
  });
});

describe('restaurant card entrance', () => {
  it('staggers only the first visible cards', () => {
    expect(entranceDelayFor(0, false)).toBe(0);
    expect(entranceDelayFor(5, false)).toBe(300);
    expect(entranceDelayFor(6, false)).toBeNull();
    expect(entranceDelayFor(undefined, false)).toBeNull();
  });

  it('skips entrance animations under Reduce Motion', () => {
    expect(entranceDelayFor(0, true)).toBeNull();
    expect(entranceDelayFor(3, true)).toBeNull();
  });
});

describe('dish sheet', () => {
  const renderSheet = () =>
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <DishSheet />
      </SafeAreaProvider>
    );

  it('adds the chosen quantity with unchanged pricing', () => {
    renderSheet();
    fireEvent.press(screen.getByTestId('dish-quantity-increase'));
    fireEvent.press(screen.getByRole('button', { name: /Add 2 to order/ }));

    const { items, total, totalItems } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(totalItems).toBe(2);
    expect(total).toBeCloseTo(19);
    expect(mockRouter.dismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores a rapid second tap while the sheet is closing', () => {
    renderSheet();
    const add = screen.getByRole('button', { name: /Add 1 to order/ });
    fireEvent.press(add);
    fireEvent.press(add);

    expect(useCartStore.getState().totalItems).toBe(1);
    expect(mockRouter.dismiss).toHaveBeenCalledTimes(1);
  });
});
