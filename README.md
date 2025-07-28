# IoT Device Dashboard

This repository contains a small dashboard for inspecting IoT router uploads and
controlling ESP32 relay boards. The project is split into a React front‑end
(`Client/`) and an Express/MQTT back‑end (`Server/`).

## Features

- Upload ZIP archives from routers and parse event statistics or iPerf results.
- View logs grouped by device UID and timestamp.
- Issue MQTT commands to ESP32 relay boards and display their state.
- REST endpoints for retrieving parsed files and device state.

## Project structure

```
Client/   # React + Vite front‑end
Server/   # Express API, MQTT client and file parser
```

## Requirements

- Node.js 18 or later
- A running MQTT broker
- MongoDB instance (used for the initial connection)

## Configuration

Both the server and client rely on environment variables. Create a `.env` file
in each directory and define the following keys:

```
# Server/.env
MONGO_URI=<mongodb connection string>
MQTT_BROKER_URL=<mqtt broker url>
MQTT_USERNAME=<mqtt username>
MQTT_PASSWORD=<mqtt password>

# Client/.env
VITE_MQTT_BROKER_URL=<mqtt broker url>
VITE_MQTT_USERNAME=<mqtt username>
VITE_MQTT_PASSWORD=<mqtt password>
```

The server listens on port `3000` by default as shown in
[`server.js`](Server/server.js) and serves the built client from the `dist`
folder.

## Running the server

```bash
cd Server
npm install
node server.js
```

## Running the client in development

```bash
cd Client
npm install
npm run dev
```

To build the client for production run `npm run build`. Copy the generated
`dist` directory into `Server/` so that the API can serve the static files.

## API overview

Important endpoints defined in
[`fileRoutes.js`](Server/routes/fileRoutes.js):

- `POST /api/upload-zip` – upload router logs as a ZIP archive.
- `GET /api/uploads` – list parsed uploads grouped by device.
- `GET /api/iperf/:id` – get iPerf bandwidth data.
- `GET /api/events/:id` – get parsed event statistics.
- `GET /api/mqtt/logs` – retrieve stored MQTT messages.
- `GET /api/mqtt/uids` – list known device states.
- `PUT /api/mqtt/:uid/relay/:num/:state` – toggle relay state on a device.
- `POST /api/image` – upload an image (stored under `uploads/images`).

See the source code for additional details on payloads and return values.

## License

This project is provided without a specific license file. Use at your own risk.
