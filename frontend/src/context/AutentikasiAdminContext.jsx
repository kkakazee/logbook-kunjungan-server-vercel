import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AutentikasiAdminContext = createContext(null);

export function AutentikasiProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // Selama true, status sesi belum diketahui — ProteksiRute menunggu dulu
  // sebelum memutuskan redirect ke /login.
  const [memuatSesi, setMemuatSesi] = useState(true);

  // Sesi disimpan di cookie httpOnly; satu-satunya cara tahu sesi masih
  // valid adalah bertanya ke server.
  useEffect(() => {
    let batal = false;
    api
      .get("/admin/saya")
      .then((res) => !batal && setAdmin(res.data))
      .catch(() => !batal && setAdmin(null))
      .finally(() => !batal && setMemuatSesi(false));
    return () => {
      batal = true;
    };
  }, []);

  async function login(username, password) {
    const res = await api.post("/admin/login", { username, password });
    setAdmin(res.data.admin);
    return res.data.admin;
  }

  async function logout() {
    try {
      await api.post("/admin/logout");
    } finally {
      setAdmin(null);
    }
  }

  return (
    <AutentikasiAdminContext.Provider
      value={{ admin, login, logout, sudahLogin: !!admin, memuatSesi }}
    >
      {children}
    </AutentikasiAdminContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAutentikasiAdmin() {
  const ctx = useContext(AutentikasiAdminContext);
  if (!ctx) {
    throw new Error("useAutentikasiAdmin harus dipakai di dalam <AutentikasiProvider>");
  }
  return ctx;
}
