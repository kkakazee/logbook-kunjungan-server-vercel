require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path"); // 1. Import modul path
const { pasangSocketIO } = require("./utils/backendSocket");
const routerPengunjung = require("./routes/pengunjungRoute");
const routerAdmin = require("./routes/adminRoute");

const app = express();
const server = http.createServer(app);

pasangSocketIO(server);

app.use(cors());
app.use(express.json());

// 2. Rute API
app.use("/api/pengunjung", routerPengunjung);
app.use("/api/admin", routerAdmin);

// === INTEGRASI FRONTEND REACT ===
// 3. Arahkan Express ke folder 'dist' milik frontend
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// 4. Fallback: Jika rute bukan /api, kembalikan ke index.html milik React
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});
// ================================

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});