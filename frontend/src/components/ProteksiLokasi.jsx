import { useEffect, useState } from "react";

// 1. Isikan koordinat kantor Jarkom BBMKG Wilayah II
const KANTOR_LAT = -6.3026207; // Ganti dengan Latitude kantor kamu
const KANTOR_LNG = 106.7564608; // Ganti dengan Longitude kantor kamu
const RADIUS_MAKSIMAL_METER = 100; // Batas radius (meter)

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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
  const [tipeError, setTipeError] = useState(null); // 'RADIUS', 'PERMISSION', 'GEO_UNSUPPORTED'

  const verifikasiLokasi = () => {
    setLoading(true);
    setPesanError("");
    setTipeError(null);

    if (!navigator.geolocation) {
      setPesanError("Browser HP Anda tidak mendukung verifikasi posisi GPS.");
      setTipeError("GEO_UNSUPPORTED");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const jarak = hitungJarakMeter(userLat, userLng, KANTOR_LAT, KANTOR_LNG);
        const jarakBulat = Math.round(jarak);
        setJarakSekarang(jarakBulat);

        if (jarakBulat <= RADIUS_MAKSIMAL_METER) {
          setIzinkanAkses(true);
        } else {
          setIzinkanAkses(false);
          setTipeError("RADIUS");
          setPesanError(`Anda terdeteksi sejauh ${jarakBulat}m dari area Jarkom BBMKG.`);
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setIzinkanAkses(false);
        if (error.code === error.PERMISSION_DENIED) {
          setTipeError("PERMISSION");
          setPesanError("Akses GPS ditolak oleh browser HP Anda.");
        } else {
          setTipeError("GEO_UNSUPPORTED");
          setPesanError("Gagal mendapatkan sinyal GPS. Pastikan Location Services HP aktif.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    verifikasiLokasi();
  }, []);

  // ---------------- UI LOADING (RADAR ANIMATION) ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>

        <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
          {/* Animated Radar Circle */}
          <div className="relative flex items-center justify-center w-32 h-32 mb-6">
            <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-ping"></div>
            <div className="absolute w-24 h-24 bg-blue-500/30 rounded-full animate-pulse"></div>
            <div className="relative z-10 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 border-2 border-blue-300">
              <svg className="w-8 h-8 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/60 mb-3">
            VERIFIKASI LOKASI PRESISI
          </span>
          <h3 className="text-xl font-bold text-white mb-2">Mendeteksi Sinyal GPS...</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Memverifikasi keberadaan fisik Anda di area Gedung Jarkom BBMKG Wilayah II.
          </p>
        </div>
      </div>
    );
  }

  // ---------------- UI AKSES DITOLAK (DENGAN INDIKATOR JARAK) ----------------
  if (!izinkanAkses) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative z-10">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Akses Form Dibatasi</h2>
              <p className="text-xs text-rose-100 opacity-90 mt-0.5">Sistem Keamanan Logbook Jarkom</p>
            </div>
          </div>

          <div className="p-6">
            {/* Visual Gauge Jarak (Jika error karena radius) */}
            {tipeError === "RADIUS" && jarakSekarang && (
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 mb-5">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-2">
                  <span>Jarak Anda Sekarang</span>
                  <span>Batas Maksimal</span>
                </div>
                
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-2xl font-black text-rose-400">{jarakSekarang} <span className="text-xs font-normal">meter</span></span>
                  <span className="text-sm font-semibold text-emerald-400">{RADIUS_MAKSIMAL_METER} <span className="text-xs font-normal">meter</span></span>
                </div>

                {/* Progress Bar Visual */}
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((jarakSekarang / (RADIUS_MAKSIMAL_METER * 3)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Pesan Keterangan Error */}
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/40 rounded-xl mb-5">
              <p className="text-xs text-rose-300 leading-relaxed text-center">
                {pesanError}
              </p>
            </div>

            {/* Petunjuk Penyelesaian */}
            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Langkah Penyelesaian:</p>
              <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc">
                {tipeError === "PERMISSION" ? (
                  <>
                    <li>Buka Pengaturan Browser HP Anda.</li>
                    <li>Pilih <strong className="text-slate-200">Site Settings / Izin Situs</strong>.</li>
                    <li>Aktifkan/Izinkan akses <strong className="text-slate-200">Lokasi (Location)</strong> untuk web ini.</li>
                  </>
                ) : (
                  <>
                    <li>Pastikan Anda sudah berada di dalam/depan gedung Jarkom BBMKG.</li>
                    <li>Matikan dan nyalakan kembali GPS HP Anda.</li>
                    <li>Pastikan tidak menggunakan VPN atau Fake GPS.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Tombol Coba Lagi */}
            <button
              onClick={verifikasiLokasi}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Verifikasi Ulang Lokasi
            </button>
          </div>

          {/* Footer Card */}
          <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 tracking-wider">
              RUANGAN JARKOM BBMKG WILAYAH II
            </span>
          </div>

        </div>
      </div>
    );
  }

  // Jika lolos verifikasi radius, tampilkan halaman form utama
  return children;
}