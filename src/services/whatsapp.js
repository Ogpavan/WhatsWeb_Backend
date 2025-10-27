const qrcode = require("qrcode");
const Pino = require("pino");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

let globalSock = null;
let lastQR = null;
let wsClients = [];
let sessions = []; // Add this line
const sessionSockets = {}; // { sessionId: sock }

async function startWhatsApp(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId is required for WhatsApp session");
  }
  // Use a unique auth folder per session
  const { state, saveCreds } = await useMultiFileAuthState(
    `./auth_info_${sessionId}`
  );
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    version,
  });
  sock.sessionId = sessionId; // <-- Add this line
  sessionSockets[sessionId] = sock;
  globalSock = sock;
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;
    if (qr) {
      const qrPng = await qrcode.toDataURL(qr, { width: 300 });
      lastQR = qrPng.split(",")[1];
      wsClients.forEach((ws) => ws.send(JSON.stringify({ qr: lastQR })));
    }
    if (connection === "open") {
      console.log("Connected user:", sock.user);
      const userDetails = {
        id: sock.user?.id || "",
        name: sock.user?.name || "",
        phone: sock.user?.phone || "",
        connectedAt: new Date().toISOString(),
      };
      console.log(userDetails);
      // Add session if not already present
      if (!sessions.find((s) => s.id === userDetails.id)) {
        sessions.push(userDetails);
      }
      wsClients.forEach((ws) =>
        ws.send(
          JSON.stringify({ status: "connected", user: userDetails, sessions })
        )
      );
      lastQR = null;
    }
    if (connection === "close") {
      // Remove session
      if (sock.user?.id) {
        sessions = sessions.filter((s) => s.id !== sock.user.id);
      }
      wsClients.forEach((ws) =>
        ws.send(JSON.stringify({ status: "disconnected", sessions }))
      );
      // Defensive: only reconnect if sessionId is valid
      if (sock.sessionId) {
        setTimeout(() => startWhatsApp(sock.sessionId), 5000);
      } else {
        console.error("Cannot reconnect: sessionId is undefined");
      }
    }
  });
}

// Add a function to get a socket by sessionId
function getSock(sessionId) {
  return sessionSockets[sessionId];
}

module.exports = {
  startWhatsApp,
  getSock, // <-- remove the arrow function, export the real function
  getLastQR: () => lastQR,
  wsClients,
  getSessions: () => sessions, // Add this line
};
