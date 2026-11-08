import { useCallback, useEffect, useState } from "react";
import { simpanLokasi } from "../api/lokasi";

// =====================================================================
// Verifikasi lokasi tamu sebelum Form Masuk / Form Keluar.
// Server juga memeriksa radius (LOKASI_* di .env), jadi pembatasan ini
// tidak bisa dilewati dengan memanggil API langsung.
// Bisa dimatikan sementara dengan VITE_LOKASI_AKTIF=false saat build.
// =====================================================================

const LOKASI_AKTIF = import.meta.env.VITE_LOKASI_AKTIF !== "false";

const KANTOR = {
  nama: "Ruang Jarkom BBMKG Wilayah II",
  lat: Number(import.meta.env.VITE_LOKASI_LAT) || -6.3026346,
  lng: Number(import.meta.env.VITE_LOKASI_LNG) || 106.75639,
  radius: Number(import.meta.env.VITE_LOKASI_RADIUS_METER) || 200,
};
// Toleransi akurasi GPS — sama dengan server (maks. 100 m)
const TOLERANSI_MAKS = 100;

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

function formatJarak(m) {
  if (m == null) return "-";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
}

const urlPetunjukArah = `https://www.google.com/maps/dir/?api=1&destination=${KANTOR.lat},${KANTOR.lng}`;

// ---------------------------------------------------------------------
// Ikon kecil
// ---------------------------------------------------------------------
const Ikon = {
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.6-7-11a7 7 0 1114 0c0 5.4-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  ulang: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.5 15a7 7 0 0012 2.5M18.5 9a7 7 0 00-12-2.5" />
    </svg>
  ),
  arah: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l18-8-8 18-2-8-8-2z" />
    </svg>
  ),
  kunci: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  ),
  sinyal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M5 12.5a10 10 0 0114 0M8 15.5a6 6 0 018 0M12 19h.01M3 3l18 18" />
    </svg>
  ),
  centang: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
};

// ---------------------------------------------------------------------
// Peta jarak: lingkaran area kantor + posisi tamu (skala menyesuaikan)
// ---------------------------------------------------------------------
function PetaJarak({ jarak, akurasi, batas }) {
  const cx = 104;
  const cy = 104;
  const rZona = 54; // px = KANTOR.radius meter
  const skala = rZona / KANTOR.radius;
  const xMaks = 292;
  const xIdeal = cx + jarak * skala;
  const terpotong = xIdeal > xMaks;
  const ux = Math.max(cx + 8, Math.min(xIdeal, xMaks));
  const rAkurasi = Math.min(Math.max(akurasi * skala, 6), 34);
  const xBatas = cx + batas * skala;

  return (
    <svg className="lok-peta" viewBox="0 0 320 208" role="img"
      aria-label={`Anda berada ${formatJarak(jarak)} dari ${KANTOR.nama}. Batas ${formatJarak(batas)}.`}>
      <defs>
        <pattern id="lok-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeOpacity=".07" />
        </pattern>
        <radialGradient id="lok-zona" r="0.5">
          <stop offset="0" stopColor="var(--success)" stopOpacity=".28" />
          <stop offset="1" stopColor="var(--success)" stopOpacity=".08" />
        </radialGradient>
      </defs>
      <rect width="320" height="208" rx="16" fill="url(#lok-grid)" />

      {/* Zona toleransi GPS & area diizinkan */}
      {batas > KANTOR.radius && xBatas < xMaks && (
        <circle cx={cx} cy={cy} r={batas * skala} fill="none" stroke="var(--success)"
          strokeOpacity=".35" strokeDasharray="2 4" />
      )}
      <circle cx={cx} cy={cy} r={rZona} fill="url(#lok-zona)" stroke="var(--success)"
        strokeWidth="1.5" strokeDasharray="5 4" className="lok-zona-garis" />
      <text x={cx} y={cy + rZona + 16} textAnchor="middle" className="lok-peta-teks lok-hijau">
        Area {formatJarak(KANTOR.radius)}
      </text>

      {/* Garis ke tamu */}
      <line x1={cx} y1={cy} x2={ux} y2={cy} stroke="var(--danger)" strokeWidth="2"
        strokeDasharray="4 4" className="lok-garis" />
      {terpotong && (
        <g transform={`translate(${(cx + rZona + ux) / 2 + 16} ${cy})`}>
          <rect x="-7" y="-9" width="14" height="18" fill="var(--surface)" />
          <path d="M-6 6 L-1 -6 M2 6 L7 -6" stroke="var(--danger)" strokeWidth="2" />
        </g>
      )}
      <g transform={`translate(${(cx + rZona + ux) / 2 - (terpotong ? 22 : 0)} ${cy - 14})`}>
        <rect x="-36" y="-13" width="72" height="22" rx="11" fill="var(--danger)" />
        <text y="2" textAnchor="middle" className="lok-peta-label">{formatJarak(jarak)}</text>
      </g>

      {/* Kantor */}
      <g transform={`translate(${cx} ${cy})`}>
        <circle r="15" fill="var(--primary)" />
        <path d="M-6 6V-1L0-6L6-1V6H2V1H-2V6Z" fill="#fff" />
      </g>
      <text x={cx} y={cy - 24} textAnchor="middle" className="lok-peta-teks">Ruang Jarkom</text>

      {/* Tamu */}
      <g transform={`translate(${ux} ${cy})`}>
        <circle r={rAkurasi} fill="var(--danger)" fillOpacity=".12" />
        <circle r="7" fill="var(--danger)" className="lok-denyut" />
        <circle r="7" fill="var(--danger)" stroke="#fff" strokeWidth="2.5" />
      </g>
      <text x={ux} y={cy + Math.max(rAkurasi, 12) + 14} textAnchor={ux > 270 ? "end" : "middle"}
        className="lok-peta-teks lok-merah">Anda</text>
    </svg>
  );
}

// ---------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------
export default function ProteksiLokasi({ children }) {
  if (!LOKASI_AKTIF) return children;
  return <CekLokasi>{children}</CekLokasi>;
}

function CekLokasi({ children }) {
  // status: memuat | oke | jauh | izin | gagal | tidakdukung
  const [status, setStatus] = useState("memuat");
  const [hasil, setHasil] = useState(null); // { jarak, akurasi, batas }
  const [tabPetunjuk, setTabPetunjuk] = useState("android");

  const verifikasi = useCallback(() => {
    setStatus("memuat");

    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus("tidakdukung");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const jarak = hitungJarakMeter(latitude, longitude, KANTOR.lat, KANTOR.lng);
        const akurasi = Math.round(accuracy || 0);
        const batas = KANTOR.radius + Math.min(akurasi, TOLERANSI_MAKS);
        setHasil({ jarak, akurasi, batas });

        if (jarak <= batas) {
          simpanLokasi(pos.coords);
          setStatus("oke");
        } else {
          setStatus("jauh");
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "izin" : "gagal");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    verifikasi();
  }, [verifikasi]);

  // ---------- Lolos: tampilkan form + penanda kecil ----------
  if (status === "oke") {
    return (
      <>
        {children}
        <div className="lok-pill" role="status">
          <span className="lok-pill-ikon">{Ikon.centang}</span>
          Lokasi terverifikasi · {formatJarak(hasil.jarak)} dari Ruang Jarkom
        </div>
      </>
    );
  }

  return (
    <div className="lok-layar">
      <div className="lok-kartu" aria-live="polite">
        <div className="lok-merek">
          <span className="lok-merek-ikon">{Ikon.pin}</span>
          <div>
            <strong>Verifikasi Lokasi</strong>
            <span>{KANTOR.nama}</span>
          </div>
        </div>

        {status === "memuat" && <TampilanMemuat />}

        {status === "jauh" && hasil && (
          <div className="lok-isi">
            <div className="lok-judul">
              <span className="lok-chip lok-chip-merah">Di luar area</span>
              <h2>Anda belum berada di area kantor</h2>
              <p>
                Form tamu hanya bisa diisi dalam radius{" "}
                <strong>{formatJarak(KANTOR.radius)}</strong> dari Ruang Jarkom.
              </p>
            </div>

            <PetaJarak {...hasil} />

            <div className="lok-statistik">
              <div>
                <span>Jarak Anda</span>
                <strong className="lok-merah">{formatJarak(hasil.jarak)}</strong>
              </div>
              <div>
                <span>Batas</span>
                <strong className="lok-hijau">{formatJarak(KANTOR.radius)}</strong>
              </div>
              <div>
                <span>Akurasi GPS</span>
                <strong className={hasil.akurasi > 100 ? "lok-kuning" : ""}>
                  ±{formatJarak(hasil.akurasi)}
                </strong>
              </div>
            </div>

            <div className="lok-catatan">
              Dekati gedung sekitar{" "}
              <strong>{formatJarak(Math.max(hasil.jarak - hasil.batas, 1))}</strong> lagi, lalu
              tekan <em>Cek Ulang Lokasi</em>.
              {hasil.akurasi > 100 && (
                <> Sinyal GPS kurang akurat — coba di dekat jendela atau di luar ruangan.</>
              )}
            </div>

            <div className="lok-tombol">
              <button type="button" className="btn btn-primary lok-btn" onClick={verifikasi}>
                {Ikon.ulang} Cek Ulang Lokasi
              </button>
              <a className="lok-btn-garis" href={urlPetunjukArah} target="_blank" rel="noopener noreferrer">
                {Ikon.arah} Petunjuk arah ke kantor
              </a>
            </div>
          </div>
        )}

        {status === "izin" && (
          <div className="lok-isi">
            <div className="lok-judul">
              <span className="lok-ikon-besar lok-ikon-kuning">{Ikon.kunci}</span>
              <span className="lok-chip lok-chip-kuning">Izin lokasi ditolak</span>
              <h2>Izinkan akses lokasi</h2>
              <p>Lokasi dipakai hanya untuk memastikan Anda berada di area kantor.</p>
            </div>

            <div className="lok-tab" role="tablist">
              {[
                ["android", "Android (Chrome)"],
                ["iphone", "iPhone (Safari)"],
              ].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tabPetunjuk === id}
                  className={tabPetunjuk === id ? "aktif" : ""} onClick={() => setTabPetunjuk(id)}>
                  {label}
                </button>
              ))}
            </div>
            <ol className="lok-langkah">
              {tabPetunjuk === "android" ? (
                <>
                  <li>Ketuk ikon <strong>gembok / pengaturan</strong> di kiri alamat situs.</li>
                  <li>Pilih <strong>Izin</strong> → <strong>Lokasi</strong> → <strong>Izinkan</strong>.</li>
                  <li>Pastikan <strong>Lokasi HP</strong> di panel notifikasi menyala.</li>
                </>
              ) : (
                <>
                  <li>Buka <strong>Pengaturan → Privasi & Keamanan → Layanan Lokasi</strong>, nyalakan.</li>
                  <li>Di daftar yang sama, pilih <strong>Safari Websites</strong> → <strong>Saat Digunakan</strong>.</li>
                  <li>Kembali ke halaman ini lalu ketuk tombol di bawah.</li>
                </>
              )}
            </ol>

            <div className="lok-tombol">
              <button type="button" className="btn btn-primary lok-btn" onClick={verifikasi}>
                {Ikon.ulang} Coba Lagi
              </button>
            </div>
          </div>
        )}

        {(status === "gagal" || status === "tidakdukung") && (
          <div className="lok-isi">
            <div className="lok-judul">
              <span className="lok-ikon-besar lok-ikon-kuning">{Ikon.sinyal}</span>
              <span className="lok-chip lok-chip-kuning">
                {status === "gagal" ? "Sinyal GPS tidak terbaca" : "Browser tidak mendukung"}
              </span>
              <h2>{status === "gagal" ? "Lokasi belum terbaca" : "Lokasi tidak bisa diperiksa"}</h2>
              <p>
                {status === "gagal"
                  ? "HP belum berhasil mendapatkan posisi Anda."
                  : "Buka halaman ini dengan Chrome atau Safari terbaru melalui alamat https://."}
              </p>
            </div>
            <ul className="lok-langkah lok-langkah-titik">
              <li>Nyalakan <strong>Lokasi / GPS</strong> di HP.</li>
              <li>Matikan mode hemat baterai sementara.</li>
              <li>Pastikan tidak memakai VPN atau aplikasi Fake GPS.</li>
            </ul>
            <div className="lok-tombol">
              <button type="button" className="btn btn-primary lok-btn" onClick={verifikasi}>
                {Ikon.ulang} Coba Lagi
              </button>
            </div>
          </div>
        )}

        <div className="lok-kaki">BBMKG Wilayah II · Jaringan Komunikasi</div>
      </div>
    </div>
  );
}

function TampilanMemuat() {
  return (
    <div className="lok-isi lok-memuat">
      <div className="lok-radar" aria-hidden="true">
        <span className="lok-radar-cincin" />
        <span className="lok-radar-cincin lok-tunda" />
        <span className="lok-radar-sapuan" />
        <span className="lok-radar-titik">{Ikon.pin}</span>
      </div>
      <h2>Memeriksa lokasi Anda…</h2>
      <p>Izinkan akses lokasi jika browser meminta.</p>
      <ul className="lok-progres">
        <li>Meminta izin lokasi</li>
        <li>Membaca sinyal GPS</li>
        <li>Mengukur jarak ke Ruang Jarkom</li>
      </ul>
    </div>
  );
}
