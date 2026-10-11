import { screen } from '@testing-library/react-native';

interface TreeNode {
  type: unknown;
  props: Record<string, unknown>;
  children: (TreeNode | string)[];
  findAll: (predicate: (node: TreeNode) => boolean, options?: { deep: boolean }) => TreeNode[];
}

const isPressable = (node: TreeNode): boolean =>
  typeof node.type === 'string' && typeof node.props.onStartShouldSetResponder === 'function';

const collectText = (node: TreeNode): string => {
  const parts: string[] = [];

  const walk = (entry: TreeNode | string) => {
    if (typeof entry === 'string') {
      parts.push(entry);
      return;
    }
    entry.children.forEach(walk);
  };

  walk(node);
  return parts.join(' ').trim();
};

const nameOf = (node: TreeNode): string | undefined => {
  const label = node.props.accessibilityLabel ?? node.props['aria-label'];
  if (typeof label === 'string' && label.trim().length > 0) return label;

  const text = collectText(node);
  return text.length > 0 ? text : undefined;
};

const describe = (node: TreeNode, index: number): string => {
  const own = node.props.testID;
  if (typeof own === 'string' && own.length > 0) return own;

  const nested = node
    .findAll((child) => typeof child.props.testID === 'string', { deep: true })
    .map((child) => child.props.testID)
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  if (nested) return `around ${nested}`;

  return `pressable #${index}`;
};

const pressables = (): TreeNode[] => {
  const root = screen.UNSAFE_root as unknown as TreeNode;
  return root.findAll(isPressable, { deep: true });
};

export const unnamedPressables = (): string[] =>
  pressables()
    .map((node, index) => (nameOf(node) ? undefined : describe(node, index)))
    .filter((entry): entry is string => entry !== undefined);

export const pressableNames = (): (string | undefined)[] => pressables().map(nameOf);

export const expectEveryPressableToBeNamed = (): void => {
  expect(unnamedPressables()).toEqual([]);
};
