import Svg, { Path } from 'react-native-svg';
import { MARK_VIEWBOX, PLATE_PATH, PLATE_STROKE, SMILE_PATH, SMILE_STROKE } from './markGeometry';

interface Props {
  size: number;
  color: string;
}

const EnjoyMark = ({ size, color }: Props) => (
  <Svg
    width={size}
    height={size}
    viewBox="116 120 792 792"
    accessible={false}
    importantForAccessibility="no-hide-descendants">
    <Path d={PLATE_PATH} fill="none" stroke={color} strokeWidth={PLATE_STROKE} strokeLinecap="round" />
    <Path d={SMILE_PATH} fill="none" stroke={color} strokeWidth={SMILE_STROKE} strokeLinecap="round" />
  </Svg>
);

export { MARK_VIEWBOX };
export default EnjoyMark;
