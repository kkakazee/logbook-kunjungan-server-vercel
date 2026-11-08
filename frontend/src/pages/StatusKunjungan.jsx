import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import {
  cekStatusKunjungan,
  ambilKunjunganTersimpan,
  simpanKunjungan,
} from "../api/storage";

const INTERVAL_POLLING_MS = 8000;
const STATUS_AKTIF = ["Menunggu Persetujuan", "Diterima"];

// Kode akses diambil dari bagian "#" URL, atau dari localStorage jika
// nomor kunjungannya sama.
function kodeAwal(id, hash) {
  const dariUrl = decodeURIComponent((hash || "").replace(/^#/, ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (dariUrl) return dariUrl;
  const tersimpan = ambilKunjunganTersimpan();
  return tersimpan?.id === id ? tersimpan.kode : "";
}

export default function StatusKunjungan() {
  const { id } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const tampilkanToast = useToast();

  const [kodeAkses, setKodeAkses] = useState(() => kodeAwal(id, hash));
  const [inputKode, setInputKode] = useState("");
  const [tamu, setTamu] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [tidakDitemukan, setTidakDitemukan] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  useDocumentTitle(
    `Status Kunjungan Tamu ${id} — Ruangan Jarkom BBMKG Wilayah II`
  );

  const muatStatus = useCallback(
    async ({ diam = false } = {}) => {
      if (!kodeAkses) {
        setMemuat(false);
        return;
      }
      if (!diam) setMemuat(true);

      try {
        const data = await cekStatusKunjungan(id, kodeAkses);
        setTamu(data);
        setTidakDitemukan(false);
        if (STATUS_AKTIF.includes(data.status)) simpanKunjungan(id, kodeAkses);
      } catch (err) {
        // Saat polling diam-diam, abaikan gangguan jaringan sementara
        if (!diam || err.status === 404) {
          setTamu(null);
          setTidakDitemukan(true);
        }
      } finally {
        if (!diam) setMemuat(false);
      }
    },
    [id, kodeAkses]
  );

  async function salinTeks(teks, pesan) {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      tampilkanToast(pesan);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      tampilkanToast("Gagal menyalin.");
    }
  }

  // Simpan link status (berisi kode akses) ke luar browser ini — misal
  // dikirim ke WhatsApp sendiri — supaya tetap bisa dibuka walau browser
  // ditutup, data terhapus, atau QR keluar terbuka di browser lain.
  async function simpanLink() {
    const url = `${window.location.origin}/status/${id}#${kodeAkses}`;
    const teks = `Kunjungan Jarkom BBMKG II\nNomor: ${id}\nKode akses: ${kodeAkses}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Status Kunjungan Jarkom", text: teks });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // dibatalkan pengguna
      }
    }
    salinTeks(teks, "Link status disalin — tempel di WhatsApp/catatan Anda.");
  }

  function salinIdKunjungan() {
    salinTeks(`${id} / ${kodeAkses}`, "Nomor & kode akses berhasil disalin.");
  }

  function tanganiKirimKode(e) {
    e.preventDefault();
    const kode = inputKode.trim().toUpperCase();
    if (!kode) return;
    setKodeAkses(kode);
    navigate(`/status/${id}#${kode}`, { replace: true });
  }

  // Muat status pertama kali + polling (pengganti Socket.IO) selama
  // kunjungan masih aktif dan tab sedang dibuka.
  useEffect(() => {
    muatStatus();
  }, [muatStatus]);

  const statusSekarang = tamu?.status;
  useEffect(() => {
    if (!STATUS_AKTIF.includes(statusSekarang)) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) muatStatus({ diam: true });
    }, INTERVAL_POLLING_MS);
    return () => clearInterval(timer);
  }, [statusSekarang, muatStatus]);

  const kotakKode = (
    <>
      <div className="kode-akses-box">
        <div className="kode-akses-label">Kode Akses (untuk Form Keluar)</div>
        <div className="kode-akses-nilai">{kodeAkses}</div>
      </div>
      <button type="button" className="btn btn-secondary btn-simpan-link" onClick={simpanLink}>
        📤 Simpan / Kirim Link Status
      </button>
      <p className="catatan-tersimpan">
        Kunjungan ini tersimpan otomatis di browser ini, jadi aman jika
        halaman di-refresh atau ditutup. Simpan link di atas jika Anda
        mungkin memakai browser/HP lain saat keluar.
      </p>
    </>
  );

  return (
    <>

    <div className="public-page">
      <SiteHeader badge="STATUS KUNJUNGAN" />

      <main>
        <section className="container narrow">
          {!memuat && !kodeAkses && (
            <form className="card form-card" onSubmit={tanganiKirimKode}>
              <div className="eyebrow">Status Kunjungan {id}</div>
              <h2>Masukkan Kode Akses</h2>
              <p className="subtitle" style={{ marginLeft: 0 }}>
                Kode akses 6 karakter tertera di halaman status saat Anda
                mendaftar.
              </p>
              <div className="field">
                <label htmlFor="inputKode">Kode Akses</label>
                <input
                  id="inputKode"
                  required
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Contoh: K7P2XM"
                  value={inputKode}
                  onChange={(e) => setInputKode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: "0.2em", fontWeight: 700 }}
                />
              </div>
              <button className="btn btn-primary" type="submit">
                CEK STATUS
              </button>
            </form>
          )}

          {memuat && (
            <div className="card status-card">
              <p className="subtitle">Memuat status kunjungan...</p>
            </div>
          )}



          {!memuat && kodeAkses && tidakDitemukan && (
            <div className="card status-card">
              <div className="status-icon no">×</div>

              <div className="eyebrow">Tidak Ditemukan</div>

              <h2>Kunjungan Tidak Ditemukan</h2>

              <p className="subtitle">
                Nomor kunjungan atau kode akses tidak cocok. Periksa kembali
                link Anda, atau daftar ulang lewat Form Masuk.
              </p>

              <button
                className="btn btn-secondary"
                onClick={() => navigate("/form-masuk")}
              >
                Ke Form Masuk
              </button>
            </div>
          )}



          {!memuat &&
            tamu &&
            tamu.status === "Menunggu Persetujuan" && (
              <div className="card status-card">
                <div className="status-icon wait">…</div>

                <div className="eyebrow">Pendaftaran Berhasil</div>

                <h2>Nomor Kunjungan</h2>

                <div className="visitor-code">{tamu.id}</div>

                {kotakKode}

                <button
                  type="button"
                  className={`btn-copy${tersalin ? " copied" : ""}`}
                  onClick={salinIdKunjungan}
                >
                  {tersalin ? "Tersalin ✓" : "Salin Nomor & Kode"}
                </button>

                <p className="reminder">
                  ⚠️ Simpan halaman ini (bookmark atau screenshot) — nomor
                  dan kode akses dibutuhkan untuk konfirmasi keluar.
                </p>

                <p className="subtitle">
                  Status: <strong>Menunggu Konfirmasi</strong>
                  
                  <br />

                  Silakan tunggu petugas menyetujui kunjungan Anda.
                </p>

                <br />

                <button
                  className="btn btn-secondary"
                  onClick={() => muatStatus()}
                >
                  Cek Status
                </button>
              </div>
          )}



          {!memuat && tamu && tamu.status === "Diterima" && (
            <div className="card status-card">
              <div className="status-icon ok">✓</div>

              <div className="eyebrow">Akses Disetujui</div>

              <h2>Anda Telah Dikonfirmasi</h2>

              <p className="subtitle">
                Data kunjungan telah disetujui oleh petugas.

                <br />
                <br />

                {tamu.namaPetugasVerifikasi && (
                  <strong className="nama-petugas-verifikasi">
                    Disetujui oleh: {tamu.namaPetugasVerifikasi}
                  </strong>
                )}

                <br />
                <br />

              </p>

              <p className="subtitle">
                Silakan memasuki ruangan. Setelah selesai, gunakan tombol di
                bawah untuk konfirmasi keluar.
              </p>

              {kotakKode}

              <br />

              <button
                className="btn btn-success"
                onClick={() => navigate("/form-keluar")}
              >
                Ke Form Keluar
              </button>
            </div>
          )}



          {!memuat && tamu && tamu.status === "Ditolak" && (
            <div className="card status-card">
              <div className="status-icon no">×</div>

              <div className="eyebrow">Akses Tidak Disetujui</div>

              <h2>Kunjungan Ditolak</h2>

              <p className="subtitle">
                Mohon mengikuti arahan petugas terkait kunjungan Anda.

                <br />
                <br />

                {tamu.namaPetugasVerifikasi && (
                  <strong>
                    Diproses oleh: {tamu.namaPetugasVerifikasi}
                  </strong>
                )}
              </p>

              {tamu.alasanDitolak && (
                <div className="status-box status-box-ditolak">
                  <strong>Alasan Ditolak:</strong>

                  <div style={{ marginTop: "8px", lineHeight: 1.6 }}>
                    {tamu.alasanDitolak}
                  </div>
                </div>
              )}

              <br />

              <button
                className="btn btn-secondary"
                onClick={() => navigate("/form-masuk")}
              >
                Kembali ke Form Masuk
              </button>
            </div>
          )}

          

          {!memuat &&
            tamu &&
            tamu.status === "Kunjungan Selesai" && (
              <div className="card status-card">
                <div className="status-icon ok">✓</div>

                <div className="eyebrow">Kunjungan Selesai</div>

                <h2>Anda Sudah Tercatat Keluar</h2>

                <p className="subtitle">
                  Terima kasih atas kunjungan Anda.
                  <br />
                  Waktu keluar: <strong>{tamu.waktuKeluar}</strong>
                </p>

                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/form-masuk")}
                >
                  Ke Form Masuk
                </button>
              </div>
            )}
        </section>
      </main>

      <Footer />

    </div>

    </>
  );
}
