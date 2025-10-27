const http = require("http");
const WebSocket = require("ws");
const handleRequest = require("./routes/whatsappRoutes");
const { wsClients, getLastQR } = require("./services/whatsapp");

function startServer(port = 5000) {
  const server = http.createServer(handleRequest);

  const wss = new WebSocket.Server({ server });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    wsClients.push(ws);
    const lastQR = getLastQR();
    if (lastQR) ws.send(JSON.stringify({ qr: lastQR }));
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      const idx = wsClients.indexOf(ws);
      if (idx !== -1) wsClients.splice(idx, 1);
    });
  });

  server.listen(port, () => {
    console.log("Server running at http://localhost:" + port);
  });
}

module.exports = startServer;
