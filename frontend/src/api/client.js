import axios from "axios";

// baseURL relatif "/api":
//  - development: diteruskan Vite ke http://localhost:3001 (vite.config.js)
//  - produksi (Vercel/Render): domain yang sama dengan frontend
//
// Sesi admin disimpan di cookie httpOnly yang diatur server, jadi token
// TIDAK pernah disentuh JavaScript (aman dari pencurian lewat XSS).
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15000,
});

// Kalau sesi admin habis (401) saat berada di halaman admin, arahkan ke
// halaman login. Halaman publik (tamu) tidak ikut di-redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname.startsWith("/admin")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export function pesanError(err, default_) {
  return err?.response?.data?.error || default_;
}

export default api;
