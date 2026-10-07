// import { io } from "socket.io-client";

// const socket = io("http://localhost:3001", {
//   autoConnect: true,
// });

// export default socket;


import { io } from "socket.io-client";

// Tanpa "http://localhost:3001" agar otomatis mengikuti domain tempat aplikasi berjalan
const socket = io({
  autoConnect: true,
});

export default socket;