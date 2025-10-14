import React from 'react';
import Svg, { Path, Line, Circle } from 'react-native-svg';

interface HourglassIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * 모래시계 아이콘 컴포넌트
 * 윤곽선 스타일의 미니멀한 디자인
 */
const HourglassIcon: React.FC<HourglassIconProps> = ({
  size = 24,
  color = '#888',
  strokeWidth = 1.5,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 상단 테두리 */}
      <Line
        x1="6"
        y1="4"
        x2="18"
        y2="4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* 모래시계 왼쪽 형태 */}
      <Path
        d="M6 4L12 12L6 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 모래시계 오른쪽 형태 */}
      <Path
        d="M18 4L12 12L18 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 하단 테두리 */}
      <Line
        x1="6"
        y1="20"
        x2="18"
        y2="20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* 중앙 모래 (작은 원) */}
      <Circle
        cx="12"
        cy="12"
        r="1.5"
        fill={color}
      />
    </Svg>
  );
};

export default HourglassIcon;
