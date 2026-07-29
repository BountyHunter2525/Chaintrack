# ⛓️ ChainTrack — Blockchain Supply Chain Tracker

> A full-stack browser-based supply chain tracking system powered by blockchain technology. Track products from manufacturer to customer with cryptographic transparency, QR codes, and real-time authenticity verification.

![ChainTrack Banner](https://img.shields.io/badge/Blockchain-Supply%20Chain-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7imqPvuI88L3RleHQ+PC9zdmc+)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📌 Project Overview

**ChainTrack** is a blockchain-based supply chain tracker that allows businesses and consumers to verify the authenticity and journey of a product — from the manufacturer all the way to the customer.

Every ownership transfer is recorded as an **immutable block** on a custom blockchain using **SHA-256 cryptographic hashing** and **Proof-of-Work**, making the audit trail tamper-proof and fully transparent.

> Built as a college project by a team of 2 developers.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| ⛓️ **Blockchain Engine** | Custom SHA-256 blockchain with Proof-of-Work (difficulty 2) |
| 📲 **QR Code Generation** | Every product gets a unique scannable QR code |
| 🔄 **Ownership Transfer** | Structured pipeline: Manufacturer → Distributor → Retailer → Customer |
| 📍 **Location History** | Every block records city, country, and GPS coordinates |
| 🔐 **Authenticity Verification** | Hash-chain integrity check with green seal / tamper alert |
| 📊 **Dashboard** | Live stats, blockchain visualisation, activity feed, pipeline chart |
| 📈 **Analytics** | 3 interactive charts — activity timeline, categories, status breakdown |
| 🗺️ **Route Map** | Leaflet.js world map showing the product's physical journey |
| 📄 **PDF Export** | Full blockchain certificate downloadable as PDF |
| 🌙 **Dark Mode** | Toggleable dark/light theme, persists across sessions |
| 🔔 **Notifications** | Full event log with timestamps |
| 👤 **Role-based Login** | Manufacturer / Distributor / Retailer / Customer personas |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (Semantic) |
| Styling | Vanilla CSS3 (Custom Design System) |
| Logic | Vanilla JavaScript ES6+ |
| Blockchain | Web Crypto API (SHA-256) |
| Charts | Chart.js v4 |
| Map | Leaflet.js v1.9 |
| QR Codes | QRCode.js |
| Storage | Browser localStorage |
| Fonts | Inter + JetBrains Mono (Google Fonts) |

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge)
- No installations or servers required ✅

### Run Locally

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/supply-chain-tracker.git

# Navigate into the folder
cd supply-chain-tracker

# Open the app
# Just double-click index.html — or open with Live Server in VS Code
```

That's it! The app runs entirely in the browser.

---

## 📂 Project Structure

```
supply-chain-tracker/
│
├── index.html              # Main SPA shell (sidebar, topbar, overlays)
│
├── styles/
│   └── main.css            # Full design system (tokens, components, dark mode)
│
├── js/
│   ├── blockchain.js       # Block class, Blockchain engine, SHA-256, PoW
│   ├── storage.js          # localStorage persistence + demo data seeder
│   ├── app.js              # Router, state management, notification system
│   ├── dashboard.js        # Dashboard view (stats, blockchain viz, charts)
│   ├── products.js         # Products list + Add product form
│   ├── detail.js           # Product detail, QR code, authenticity seal
│   ├── transfer.js         # Ownership transfer, QR scan, chain verify
│   └── extras.js           # Dark mode, map, analytics, PDF, login, notifications
│
└── README.md
```

---

## 🖥️ Screenshots

### Dashboard
- 4 live stat cards (products, in-transit, delivered, transfers)
- Live blockchain block visualisation
- Real-time activity feed
- Pipeline status doughnut chart

### Product Detail
- Auto-generated QR code (downloadable as PNG)
- Cryptographic authenticity seal
- Step-by-step supply chain journey map
- Full block history with SHA-256 hashes

### Transfer Ownership
- Visual from/to role picker
- Mines a new block with Proof-of-Work
- Records location, actor, condition, and notes

### Analytics
- 7-day activity bar chart
- Product category doughnut chart
- Status distribution chart

### Route Map
- Leaflet.js world map
- Product pins with role-colour coding
- Dotted route lines between locations

---

## 🔗 How the Blockchain Works

```
Genesis Block (Manufacturer)
   │  hash: 00a1b2c3...
   │  previousHash: 0000...0000
   ▼
Block #1 (Distributor)
   │  hash: 00d4e5f6...
   │  previousHash: 00a1b2c3...
   ▼
Block #2 (Retailer)
   │  hash: 00g7h8i9...
   │  previousHash: 00d4e5f6...
   ▼
Block #3 (Customer)
      hash: 00j1k2l3...
      previousHash: 00g7h8i9...
```

- Each block is linked by the **previous block's hash**
- If any block is tampered, the chain breaks → **tamper detected**
- Proof-of-Work ensures blocks start with `00` (difficulty 2)
- Hashing uses the browser's native **Web Crypto API (SHA-256)**

---

## 👥 Team

| Member | Role |
|--------|------|
| Member 1 | Blockchain engine, storage layer, product flow |
| Member 2 | UI/UX design, analytics, map, PDF export |

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

## 🙏 Acknowledgements

- [Chart.js](https://www.chartjs.org/) — Beautiful charts
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [QRCode.js](https://davidshimjs.github.io/qrcodejs/) — QR code generation
- [OpenStreetMap](https://www.openstreetmap.org/) — Map tiles
- [Google Fonts](https://fonts.google.com/) — Inter & JetBrains Mono

---

<div align="center">
  <strong>⛓️ Built with blockchain transparency in mind</strong><br/>
  <sub>No server. No backend. Pure browser-powered blockchain.</sub>
</div>
