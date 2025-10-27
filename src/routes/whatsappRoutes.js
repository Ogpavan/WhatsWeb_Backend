const { startWhatsApp, getSock } = require("../services/whatsapp");
const { v4: uuidv4 } = require("uuid"); // Add this line at the top

function handleRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { phone, message } = JSON.parse(body);
        const sock = getSock();
        if (!sock || !sock.user) throw new Error("WhatsApp not connected"); // Check for sock.user too!
        await sock.sendMessage(phone + "@s.whatsapp.net", { text: message });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/start-session") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        let { sessionId } = JSON.parse(body);
        if (!sessionId) {
          sessionId = uuidv4(); // Generate a new UUID if not provided
        }
        await startWhatsApp(sessionId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, sessionId })); // Return sessionId to client
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/send-message") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { sessionId, to, message } = JSON.parse(body);
        const sock = getSock(sessionId);
        if (!sock) throw new Error("Session not found");
        await sock.sendMessage(to, { text: message });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
}

module.exports = handleRequest;
