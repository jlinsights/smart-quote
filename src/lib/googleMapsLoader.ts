/**
 * Google Maps 3D API loader (alpha version).
 * Uses dynamic script injection to load the alpha build with maps3d + marker libraries.
 */

let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps3D(): Promise<void> {
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key not configured'));
  }

  // Already loaded (e.g. by another script tag)
  if (typeof google !== 'undefined' && google.maps) {
    return Promise.resolve();
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps3d,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
