import { useEffect, useState } from "react";

// 1. Isikan koordinat kantor yang disalin dari Google Maps
const KANTOR_LAT = -6.3026207; // Ganti dengan Latitude kantor kamu
const KANTOR_LNG = 106.7564608; // Ganti dengan Longitude kantor kamu
const RADIUS_MAKSIMAL_METER = 100; // Batas radius (misal: 100 meter dari kantor)

// Rumus Haversine untuk menghitung jarak 2 titik koordinat (dalam meter)
function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ProteksiLokasi({ children }) {
  const [loading, setLoading] = useState(true);
  const [izinkanAkses, setIzinkanAkses] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [jarakSekarang, setJarakSekarang] = useState(null);

  const verifikasiLokasi = () => {
    setLoading(true);
    setPesanError("");

    if (!navigator.geolocation) {
      setPesanError("Browser HP Anda tidak mendukung fitur lokasi GPS.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const jarak = hitungJarakMeter(userLat, userLng, KANTOR_LAT, KANTOR_LNG);
        setJarakSekarang(Math.round(jarak));

        if (jarak <= RADIUS_MAKSIMAL_METER) {
          setIzinkanAkses(true);
        } else {
          setIzinkanAkses(false);
          setPesanError(`Anda berada di luar area kantor (${Math.round(jarak)} meter dari kantor). Mandat batas maksimal adalah ${RADIUS_MAKSIMAL_METER} meter.`);
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setIzinkanAkses(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPesanError("Akses lokasi ditolak. Harap izinkan (Allow) akses lokasi GPS pada browser HP Anda.");
        } else {
          setPesanError("Gagal mendeteksi lokasi GPS HP Anda. Pastikan GPS aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    verifikasiLokasi();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-gray-600">Memeriksa lokasi Anda saat ini...</p>
      </div>
    );
  }

  if (!izinkanAkses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50">
        <div className="max-w-md p-6 bg-white shadow-lg rounded-xl border border-red-100">
          <div className="text-4xl mb-3">📍</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Akses Dibatasi</h2>
          <p className="text-sm text-red-600 mb-4">{pesanError}</p>
          <button
            onClick={verifikasiLokasi}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Coba Cek Lokasi Lagi
          </button>
        </div>
      </div>
    );
  }

  return children;
}