import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import {
  catatKunjunganKeluar,
  ambilKunjunganTersimpan,
  hapusKunjunganTersimpan,
} from "../api/storage";

export default function FormKeluar() {
  useDocumentTitle("Form Keluar Tamu — Ruangan Jarkom BBMKG Wilayah II");
  const tampilkanToast = useToast();
  const navigate = useNavigate();
  // Isi otomatis dari kunjungan aktif yang tersimpan di browser ini
  const [tersimpan] = useState(() => ambilKunjunganTersimpan());
  const [idKunjungan, setIdKunjungan] = useState(tersimpan?.id || "");
  const [kodeAkses, setKodeAkses] = useState(tersimpan?.kode || "");
  const [hasil, setHasil] = useState(null); // { nama, waktu } setelah berhasil
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    if (tersimpan) {
      tampilkanToast("Nomor & kode kunjungan terakhir otomatis terisi.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tanganiSubmit(e) {
    e.preventDefault();
    const id = idKunjungan.trim().toUpperCase();

    setMengirim(true);
    try {
      const kunjungan = await catatKunjunganKeluar(id, kodeAkses.trim().toUpperCase());
      hapusKunjunganTersimpan();
      setHasil({
        nama: (kunjungan.namaTamu || []).join(", "),
        waktu: kunjungan.waktuKeluar,
      });
    } catch (err) {
      tampilkanToast(err.message);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <>
    
    <div className="public-page">
      <SiteHeader badge="TAMU KELUAR" />
      <main>
        <section className="container narrow">
          <div className="eyebrow">QR Pintu Keluar</div>
          <h1>Tamu Keluar</h1>
          <p className="subtitle" style={{ marginLeft: 0 }}>
            Masukkan nomor kunjungan dan kode akses yang diperoleh saat
            melakukan pendaftaran masuk. Lupa kode akses? Minta petugas
            mencatat kepulangan Anda.
          </p>

          {!hasil && (
            <form className="card form-card" onSubmit={tanganiSubmit}>
              <div className="field">
                <label htmlFor="idKunjungan">Nomor Kunjungan</label>
                <input
                  id="idKunjungan"
                  required
                  placeholder="Contoh: 05092026-004"
                  value={idKunjungan}
                  onChange={(e) => setIdKunjungan(e.target.value)}
                  maxLength={13}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="kodeAkses">Kode Akses</label>
                <input
                  id="kodeAkses"
                  required
                  placeholder="6 karakter, contoh: K7P2XM"
                  value={kodeAkses}
                  onChange={(e) => setKodeAkses(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  style={{ letterSpacing: "0.2em", fontWeight: 700 }}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={mengirim}>
                {mengirim ? "MEMPROSES..." : "KONFIRMASI KELUAR"}
              </button>
            </form>
          )}

          {hasil && (
            <div className="card status-card">
              <div className="status-icon ok">✓</div>
              <div className="eyebrow">QR Pintu Keluar</div>
              <h2>Data Kepulangan Tercatat</h2>
              <p className="subtitle">
                Terima kasih atas kunjungan Anda. Data waktu keluar telah
                tersimpan.
              </p>
              <div className="status-box">
                Nama: <strong>{hasil.nama}</strong>
                <br />
                Waktu keluar: <strong>{hasil.waktu}</strong>
              </div>
              <button
                className="btn btn-success"
                onClick={() => navigate("/form-masuk")}
              >
                Selesai
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
