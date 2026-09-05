// export const BACKEND_URL = "https://c3website-backend.onrender.com";
export const BACKEND_URL: string =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('172.')
    ? `http://${window.location.hostname}:5001`
    : 'https://c3-website-backend-o42h.onrender.com';
