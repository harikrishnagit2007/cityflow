import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory message store for polling fallback and broadcasting
const messageHistory = [];

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Smart Roads', uptime: process.uptime() });
});

app.get('/api/poll', (req, res) => {
  const since = parseInt(req.query.since || '0', 10);
  const updates = messageHistory.filter(msg => msg.timestamp > since);
  res.json(updates);
});

app.get('/api/traffic', (req, res) => {
  const trafficData = {
    status: 'moderate',
    cityCongestion: 42,
    alerts: [
      { id: 1, location: 'Downtown Expressway', severity: 'high', type: 'congestion', description: 'Heavy congestion, expect 15-20m delays' },
      { id: 2, location: 'Northern Bridge', severity: 'low', type: 'cleared', description: 'Traffic clearing, normal flow restored' },
      { id: 3, location: 'Central Avenue', severity: 'medium', type: 'construction', description: 'Lane closure due to roadwork' }
    ],
    timestamp: Date.now()
  };
  res.json(trafficData);
});

// Module routes aliases
app.get('/modules/commuters.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'commuters.html'));
});

app.get('/modules/delivery.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'delivery.html'));
});

app.get('/modules/cab-drivers.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'cab-drivers.html'));
});

app.get('/modules/emergency.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'emergency.html'));
});

// Assets CSS aliases
app.get('/assets/css/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/assets/css/pwa.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'pwa.css'));
});

// Assets JS aliases
app.get('/assets/js/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.get('/assets/js/maps.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'maps.js'));
});

app.get('/assets/js/realtime.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'realtime.js'));
});

app.get('/assets/js/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'service-worker.js'));
});

app.get('/assets/js/modules/commuters.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'commuters.js'));
});

app.get('/assets/js/modules/cab-drivers.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'cab-drivers.js'));
});

app.get('/assets/js/modules/delivery.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'delivery.js'));
});

app.get('/assets/js/modules/emergency.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'emergency.js'));
});

// Assets Icons & Screenshots fallback
app.get('/assets/icons/:icon', (req, res) => {
  res.sendFile(path.join(__dirname, 'IMG_7383.PNG'));
});

app.get('/assets/screenshots/:screenshot', (req, res) => {
  res.sendFile(path.join(__dirname, 'IMG_7386.PNG'));
});

// Static directory serving
app.use(express.static(__dirname));

// Fallback to index.html for unknown HTML paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Setup WebSocket Server for live updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      // Record message in history
      const record = {
        ...data,
        timestamp: data.timestamp || Date.now()
      };
      messageHistory.push(record);
      if (messageHistory.length > 200) {
        messageHistory.shift();
      }

      // Broadcast to all other connected clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(record));
        }
      });
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Roads server listening on http://0.0.0.0:${PORT}`);
});
