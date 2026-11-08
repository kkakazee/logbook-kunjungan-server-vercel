import { useCallback, useEffect, useState } from "react";
import { simpanLokasi } from "../api/lokasi";

// Koordinat kantor Jarkom BBMKG Wilayah II. Server juga memeriksa radius
// (LOKASI_LAT / LOKASI_LNG / LOKASI_RADIUS_METER di environment), jadi
// pembatasan ini tidak bisa dilewati hanya dengan memanggil API langsung.
const KANTOR_LAT = -6.3026346;
const KANTOR_LNG = 106.75639;
const RADIUS_MAKSIMAL_METER = 200;

function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const IkonLokasi = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IkonPeringatan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// Bisa dimatikan sementara (misal untuk uji coba dari luar kantor) dengan
// VITE_LOKASI_AKTIF=false saat build. Server juga harus dimatikan dengan
// LOKASI_AKTIF=false.
const LOKASI_AKTIF = import.meta.env.VITE_LOKASI_AKTIF !== "false";

export default function ProteksiLokasi({ children }) {
  if (!LOKASI_AKTIF) return children;
  return <CekLokasi>{children}</CekLokasi>;
}

function CekLokasi({ children }) {
  const [loading, setLoading] = useState(true);
  const [izinkanAkses, setIzinkanAkses] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [jarakSekarang, setJarakSekarang] = useState(null);
  const [tipeError, setTipeError] = useState(null); // 'RADIUS' | 'PERMISSION' | 'GEO_UNSUPPORTED'

  const verifikasiLokasi = useCallback(() => {
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
        const { latitude, longitude } = position.coords;
        const jarak = Math.round(hitungJarakMeter(latitude, longitude, KANTOR_LAT, KANTOR_LNG));
        setJarakSekarang(jarak);

        if (jarak <= RADIUS_MAKSIMAL_METER) {
          simpanLokasi(position.coords);
          setIzinkanAkses(true);
        } else {
          setIzinkanAkses(false);
          setTipeError("RADIUS");
          setPesanError(`Posisi Anda terdeteksi ${jarak} m dari area Jarkom BBMKG.`);
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
  }, []);

  useEffect(() => {
    verifikasiLokasi();
  }, [verifikasiLokasi]);

  if (loading) {
    return (
      <div className="lokasi-layar">
        <div className="lokasi-konten">
          <div className="lokasi-radar">
            <span className="lokasi-radar-ping" />
            <span className="lokasi-radar-inti">
              <IkonLokasi />
            </span>
          </div>
          <span className="lokasi-badge">VERIFIKASI LOKASI</span>
          <h3>Mendeteksi Sinyal GPS...</h3>
          <p>Memverifikasi keberadaan Anda di area Gedung Jarkom BBMKG Wilayah II.</p>
        </div>
      </div>
    );
  }

  if (!izinkanAkses) {
    return (
      <div className="lokasi-layar">
        <div className="lokasi-kartu">
          <div className="lokasi-kartu-header">
            <span className="lokasi-ikon-header">
              <IkonPeringatan />
            </span>
            <div>
              <h2>Akses Form Dibatasi</h2>
              <p>Logbook Kunjungan Jarkom</p>
            </div>
          </div>

          <div className="lokasi-kartu-isi">
            {tipeError === "RADIUS" && jarakSekarang !== null && (
              <div className="lokasi-jarak">
                <div className="lokasi-jarak-baris">
                  <span>Jarak Anda</span>
                  <span>Batas Maksimal</span>
                </div>
                <div className="lokasi-jarak-baris">
                  <strong className="lokasi-jarak-anda">{jarakSekarang} m</strong>
                  <strong className="lokasi-jarak-batas">{RADIUS_MAKSIMAL_METER} m</strong>
                </div>
                <div className="lokasi-progress">
                  <div
                    style={{
                      width: `${Math.min((jarakSekarang / (RADIUS_MAKSIMAL_METER * 3)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="lokasi-pesan">{pesanError}</div>

            <div>
              <p className="lokasi-langkah-judul">Langkah Penyelesaian:</p>
              <ul className="lokasi-langkah">
                {tipeError === "PERMISSION" ? (
                  <>
                    <li>Buka pengaturan browser HP Anda.</li>
                    <li>Pilih <strong>Izin Situs → Lokasi</strong>.</li>
                    <li>Pilih <strong>Izinkan</strong> untuk situs ini.</li>
                  </>
                ) : (
                  <>
                    <li>Pastikan Anda berada di gedung Jarkom BBMKG.</li>
                    <li>Matikan lalu hidupkan kembali GPS HP Anda.</li>
                    <li>Pastikan tidak mengaktifkan VPN / Fake GPS.</li>
                  </>
                )}
              </ul>
            </div>

            <button type="button" className="btn btn-primary" onClick={verifikasiLokasi}>
              Verifikasi Ulang Lokasi
            </button>
          </div>

          <div className="lokasi-kartu-footer">BBMKG WILAYAH II - JARKOM</div>
        </div>
      </div>
    );
  }

  return children;
}
