import { FlashList } from '@shopify/flash-list';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

interface Row {
  id: string;
  kind: 'header' | 'row';
}

const data: Row[] = [
  { id: 'first', kind: 'header' },
  { id: 'second', kind: 'row' },
  { id: 'third', kind: 'row' },
];

describe('the FlashList test environment', () => {
  it('measures a viewport so rows actually render', () => {
    render(
      <FlashList
        testID="setup-list"
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.id}</Text>}
      />
    );

    expect(screen.getByTestId('setup-list')).toBeTruthy();
    expect(screen.getByText('first')).toBeTruthy();
    expect(screen.getByText('second')).toBeTruthy();
    expect(screen.getByText('third')).toBeTruthy();
  });

  it('asks for the type of every row so recycling pools stay separate', () => {
    const getItemType = jest.fn((item: Row) => item.kind);

    render(
      <FlashList
        data={data}
        keyExtractor={(item) => item.id}
        getItemType={getItemType}
        renderItem={({ item }) => <View testID={`row-${item.kind}`} />}
      />
    );

    expect(getItemType).toHaveBeenCalled();
    expect(screen.getByTestId('row-header')).toBeTruthy();
    expect(screen.getAllByTestId('row-row')).toHaveLength(2);
  });
});
