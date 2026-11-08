# Image aplikasi Logbook Jarkom (frontend React + API Express).
# Mendukung amd64 & arm64 (Raspberry Pi 4/5 64-bit).

# ---------- Tahap 1: build frontend ----------
FROM node:22-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Nilai VITE_* dibaca saat build (bukan saat jalan)
ARG VITE_LOKASI_AKTIF=true
ENV VITE_LOKASI_AKTIF=$VITE_LOKASI_AKTIF
RUN npx vite build

# ---------- Tahap 2: runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: lewati postinstall (install frontend) — frontend sudah di-build
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY backend ./backend
COPY scripts ./scripts
COPY database ./database
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/ping || exit 1
CMD ["node", "backend/src/server.js"]
