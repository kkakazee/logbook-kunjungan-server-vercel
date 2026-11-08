import { useEffect, useMemo, useState } from "react";
import { muatDataTamu, catatKeluarOlehPetugas } from "../api/storage";
import { useAutentikasiAdmin } from "../context/AutentikasiAdminContext";
import { useToast } from "../context/ToastContext";
import realtime from "../api/realtime";
import StatusBadge from "../components/StatusBadge";
import DetailKunjunganModal from "../components/DetailKunjunganModal";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function AdminTamuHariIni() {
  useDocumentTitle("Tamu Hari Ini — BBMKG Wilayah II");
  const [daftarTamu, setDaftarTamu] = useState([]);
  const [kunjunganDetail, setKunjunganDetail] = useState(null);
  const [memproses, setMemproses] = useState(null);
  const { admin } = useAutentikasiAdmin();
  const tampilkanToast = useToast();
  const bisaCatatKeluar = admin?.role !== "utama";

  async function tanganiCatatKeluar(e, v) {
    e.stopPropagation(); // jangan buka modal detail
    const nama = (v.namaTamu || []).join(", ");
    if (!window.confirm(`Catat ${nama} (${v.id}) sudah keluar sekarang?`)) return;
    setMemproses(v.id);
    try {
      const baru = await catatKeluarOlehPetugas(v.id);
      setDaftarTamu((prev) => prev.map((k) => (k.id === v.id ? baru : k)));
      tampilkanToast(`${v.id} dicatat keluar.`);
    } catch (err) {
      tampilkanToast(err.message);
    } finally {
      setMemproses(null);
    }
  }

  useEffect(() => {
    async function muatUlang() {
      const data = await muatDataTamu();
      setDaftarTamu(data);
    }

    muatUlang();

    function tanganiPerubahan() {
      muatUlang();
    }

    realtime.on("kunjungan:baru", tanganiPerubahan);
    realtime.on("kunjungan:diubah", tanganiPerubahan);

    return () => {
      realtime.off("kunjungan:baru", tanganiPerubahan);
      realtime.off("kunjungan:diubah", tanganiPerubahan);
    };

  }, []);

  

  const labelHariIni = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const tamuHariIni = useMemo(() => {
    const kunciHariIni = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    return daftarTamu.filter(
      (v) => v.waktuMasukIso && v.waktuMasukIso.slice(0, 10) === kunciHariIni
    );
  }, [daftarTamu]);



  return (
    <section className="dashboard">
      <div className="dashboard-top">
        <div>
          <div className="eyebrow">Panel Petugas</div>
          <h1 style={{ textAlign: "left" }}>Tamu Hari Ini</h1>
          <p className="subtitle" style={{ marginLeft: 0, textAlign: "left" }}>
            {labelHariIni} — {tamuHariIni.length} kunjungan
          </p>
        </div>
      </div>

      {tamuHariIni.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>ID Kunjungan</th>
                <th>Nama Tamu</th>
                <th>Unit Kerja / Instansi</th>
                <th>Keperluan</th>
                <th>Waktu Masuk</th>
                <th>Waktu Keluar</th>
                <th>Status</th>
                {bisaCatatKeluar && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {tamuHariIni.map((v, index) => (
                <tr key={v.id} onClick={() => setKunjunganDetail(v)} style={{ cursor: "pointer" }}>
                  <td className="col-no">{index + 1}</td>
                  <td className="col-id">{v.id}</td>
                  <td>{(v.namaTamu || []).join(", ")}</td>
                  <td>{v.unitKerja}</td>
                  <td>{v.keperluan}</td>
                  <td>{v.waktuMasuk}</td>
                  <td>{v.waktuKeluar || "-"}</td>
                  <td>
                    <StatusBadge status={v.status} />
                  </td>
                  {bisaCatatKeluar && (
                    <td>
                      {v.status === "Diterima" ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          disabled={memproses === v.id}
                          onClick={(e) => tanganiCatatKeluar(e, v)}
                          title="Gunakan jika tamu kehilangan kode akses"
                        >
                          {memproses === v.id ? "..." : "Catat Keluar"}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">Belum ada tamu hari ini.</div>
      )}

      <DetailKunjunganModal
        kunjungan={kunjunganDetail}
        onClose={() => setKunjunganDetail(null)}
      />
    </section>
  );
}
