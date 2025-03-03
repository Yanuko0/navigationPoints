declare module 'react-avatar-editor' {
  import * as React from 'react';

  export interface AvatarEditorProps {
    image: string | File;
    width?: number;
    height?: number;
    border?: number;
    borderRadius?: number;
    scale?: number;
    rotate?: number;
    onLoadSuccess?: (imgInfo: { width: number; height: number }) => void;
    onLoadFailure?: (event: Event) => void;
    onImageReady?: (event: Event) => void;
    onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onPositionChange?: (position: { x: number; y: number }) => void;
    disableBoundaryChecks?: boolean;
    disableHiDPIScaling?: boolean;
    crossOrigin?: string;
    style?: React.CSSProperties;
    className?: string;
  }

  export default class AvatarEditor extends React.Component<AvatarEditorProps> {
    getImage(): HTMLCanvasElement;
    getImageScaledToCanvas(): HTMLCanvasElement;
    getCroppingRect(): { x: number; y: number; width: number; height: number };
  }
} 