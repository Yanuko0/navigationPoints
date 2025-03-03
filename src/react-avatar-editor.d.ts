declare module 'react-avatar-editor' {
    import { Component } from 'react';

    interface AvatarEditorProps {
      image: string | File;
      width?: number;
      height?: number;
      border?: number | [number, number];
      borderRadius?: number;
      color?: [number, number, number, number]; // RGBA
      scale?: number;
      rotate?: number;
      style?: React.CSSProperties;
      onLoadFailure?: (event: any) => void;
      onLoadSuccess?: (imgInfo: any) => void;
      onImageReady?: (event: any) => void;
      onMouseUp?: (event: any) => void;
      onMouseMove?: (event: any) => void;
      onPositionChange?: (position: any) => void;
      disableBoundaryChecks?: boolean;
      disableHiDPIScaling?: boolean;
    }

    export default class AvatarEditor extends Component<AvatarEditorProps> {
      getImage(): HTMLCanvasElement;
      getImageScaledToCanvas(): HTMLCanvasElement;
      getCroppingRect(): { x: number; y: number; width: number; height: number };
    }
  }