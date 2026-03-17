/**
 * Minimal type declarations for the Google Maps 3D (alpha) API.
 *
 * The official @types/google.maps do not yet cover `maps3d`, so we provide
 * just enough surface area for our RouteMap3D component.
 */

/* eslint-disable @typescript-eslint/no-empty-object-type */

declare namespace google.maps.maps3d {
  interface Map3DElementOptions {
    center?: { lat: number; lng: number; altitude: number };
    range?: number;
    tilt?: number;
    heading?: number;
    defaultLabelsDisabled?: boolean;
  }

  interface FlyCameraToOptions {
    endCamera: {
      center: { lat: number; lng: number; altitude: number };
      range?: number;
      tilt?: number;
      heading?: number;
    };
    durationMillis?: number;
  }

  interface FlyCameraAroundOptions {
    camera: {
      center: { lat: number; lng: number; altitude: number };
      range?: number;
      tilt?: number;
      heading?: number;
    };
    durationMillis?: number;
    rounds?: number;
  }

  class Map3DElement extends HTMLElement {
    center: { lat: number; lng: number; altitude: number };
    range: number;
    tilt: number;
    heading: number;
    defaultLabelsDisabled: boolean;
    flyCameraTo(options: FlyCameraToOptions): void;
    flyCameraAround(options: FlyCameraAroundOptions): void;
    stopCameraAnimation(): void;
  }

  class Marker3DElement extends HTMLElement {
    position: { lat: number; lng: number; altitude?: number };
    label?: string;
    altitudeMode?: string;
    extruded?: boolean;
    collisionBehavior?: string;
  }

  interface Polyline3DElementOptions {}

  class Polyline3DElement extends HTMLElement {
    altitudeMode?: string;
    strokeColor?: string;
    strokeWidth?: number;
    drawsOccludedSegments?: boolean;
  }

  class Polyline3DInteractiveElement extends Polyline3DElement {}

  class AltitudeMode {
    static readonly ABSOLUTE: string;
    static readonly CLAMP_TO_GROUND: string;
    static readonly RELATIVE_TO_GROUND: string;
    static readonly RELATIVE_TO_MESH: string;
  }
}

declare namespace google.maps {
  function importLibrary(library: string): Promise<unknown>;
}
