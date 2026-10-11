jest.mock('@/lib/supabase', () => ({
  supabase: require('./helpers/supabase').createSupabaseMock(),
}));

const mockScrollToEnd = jest.fn();
const mockListProps: { current: Record<string, unknown> | null } = { current: null };

jest.mock('@shopify/flash-list', () => {
  const actual = jest.requireActual('@shopify/flash-list');
  const React = require('react') as typeof import('react');

  const FlashList = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      mockListProps.current = props;
      const innerRef = React.useRef<Record<string, unknown> | null>(null);
      React.useImperativeHandle(ref, () => ({
        ...(innerRef.current ?? {}),
        scrollToEnd: mockScrollToEnd,
      }));
      return React.createElement(actual.FlashList, { ...props, ref: innerRef });
    }
  );

  return { ...actual, FlashList };
});

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

const mockSend = jest.fn();
const mockLoadOlder = jest.fn();
const mockRetry = jest.fn();

const mockChat = {
  access: {
    can_read: true,
    can_send: true,
    counterpart_name: 'Courier A',
    reason: 'open',
  } as Record<string, unknown> | undefined,
  messages: [] as unknown[],
  outgoing: [] as unknown[],
  canRead: true,
  canSend: true,
  isLoading: false,
  error: null as unknown,
  hasOlder: false,
  isLoadingOlder: false,
  isOlderError: false,
  connection: 'connected',
};

jest.mock('@/hooks/useOrderChat', () => ({
  useOrderChat: () => ({
    ...mockChat,
    accessError: null,
    isAccessLoading: false,
    refetchAccess: jest.fn(),
    refetch: jest.fn(),
    loadOlder: mockLoadOlder,
    send: mockSend,
    retry: mockRetry,
    discard: jest.fn(),
    markRead: jest.fn(() => Promise.resolve()),
  }),
  mergeChatTimeline: jest.requireActual('@/hooks/useOrderChat').mergeChatTimeline,
}));

import ChatScreen from '@/app/(app)/(auth)/order/chat';
import type { OrderMessage, OutgoingMessage } from '@/types/database';
import { fireEvent, render, screen } from '@testing-library/react-native';

const timelineBodies = (): string[] =>
  ((mockListProps.current?.data ?? []) as { body: string }[]).map((entry) => entry.body);

const message = (id: string, body: string, createdAt: string): OrderMessage =>
  ({
    id,
    order_id: 'order-1',
    sender_id: 'courier-1',
    sender_role: 'courier',
    client_message_id: `client-${id}`,
    body,
    created_at: createdAt,
    is_mine: false,
  }) as OrderMessage;

const pending = (clientMessageId: string, body: string): OutgoingMessage => ({
  client_message_id: clientMessageId,
  body,
  state: 'pending',
  created_at: '2026-02-01T12:00:00.000Z',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockListProps.current = null;
  mockChat.messages = [];
  mockChat.outgoing = [];
  mockChat.hasOlder = false;
  mockChat.isLoadingOlder = false;
  mockChat.isOlderError = false;
  mockChat.canSend = true;
  mockChat.isLoading = false;
  mockChat.error = null;
});

describe('the chat timeline', () => {
  it('renders the conversation oldest first so the newest sits at the bottom', () => {
    mockChat.messages = [
      message('m2', 'Second', '2026-02-01T11:00:00.000Z'),
      message('m1', 'First', '2026-02-01T10:00:00.000Z'),
    ];

    render(<ChatScreen />);

    expect(timelineBodies()).toEqual(['First', 'Second']);
  });

  it('renders the list anchored to the bottom', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];

    render(<ChatScreen />);

    expect(screen.getByTestId('chat-list').props.maintainVisibleContentPosition).toEqual(
      expect.objectContaining({ startRenderingFromBottom: true })
    );
  });

  it('keeps an unsent message after the delivered ones', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.outgoing = [pending('client-new', 'Still sending')];

    render(<ChatScreen />);

    expect(timelineBodies()).toEqual(['First', 'Still sending']);
    expect(screen.getByTestId('message-pending-client-new')).toBeTruthy();
  });

  it('gives a pending bubble its own recycling pool', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.outgoing = [pending('client-new', 'Still sending')];

    render(<ChatScreen />);

    const getItemType = mockListProps.current?.getItemType as (
      entry: unknown
    ) => string | undefined;
    const data = mockListProps.current?.data as unknown[];

    expect(data.map((entry) => getItemType(entry))).toEqual(['delivered', 'pending']);
  });

  it('shows the empty state with no messages', () => {
    render(<ChatScreen />);

    expect(screen.getByTestId('chat-empty')).toBeTruthy();
  });
});

describe('paging through older messages', () => {
  it('asks for older messages when the top comes into view', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.hasOlder = true;

    render(<ChatScreen />);
    screen.getByTestId('chat-list').props.onStartReached();

    expect(mockLoadOlder).toHaveBeenCalled();
  });

  it('puts the older messages affordance above the conversation', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.hasOlder = true;

    render(<ChatScreen />);

    expect(screen.getByText('Pull down for earlier messages')).toBeTruthy();
  });

  it('shows a spinner while an older page loads', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.isLoadingOlder = true;

    render(<ChatScreen />);

    expect(screen.getByTestId('chat-loading-older')).toBeTruthy();
  });

  it('offers a retry when an older page failed', () => {
    mockChat.messages = [message('m1', 'First', '2026-02-01T10:00:00.000Z')];
    mockChat.isOlderError = true;

    render(<ChatScreen />);
    fireEvent.press(screen.getByTestId('chat-older-retry'));

    expect(mockLoadOlder).toHaveBeenCalled();
  });
});

describe('sending a message', () => {
  it('sends the draft and scrolls down to it', () => {
    render(<ChatScreen />);

    fireEvent.changeText(screen.getByTestId('chat-input'), 'On my way');
    fireEvent.press(screen.getByTestId('chat-send'));

    expect(mockSend).toHaveBeenCalledWith('On my way');
    expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('clears the draft after sending', () => {
    render(<ChatScreen />);

    fireEvent.changeText(screen.getByTestId('chat-input'), 'On my way');
    fireEvent.press(screen.getByTestId('chat-send'));

    expect(screen.getByTestId('chat-input').props.value).toBe('');
  });

  it('hides the composer when the order no longer allows messages', () => {
    mockChat.canSend = false;

    render(<ChatScreen />);

    expect(screen.queryByTestId('chat-send')).toBeNull();
    expect(screen.getByTestId('chat-closed')).toBeTruthy();
  });
});
