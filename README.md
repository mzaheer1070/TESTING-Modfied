# Portfolio

> A modern, high-performance, and responsive portfolio website showcasing web applications, API tooling, and interactive projects.

🔗 **Live Demo:** https://mzaheer1070.github.io/Portfolio/

---

## 📌 About

This is a personal portfolio website featuring web development projects, API integrations, live dashboards, and a functional contact system powered by Firebase Firestore.

---

## ✨ Features

| Feature                  | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| 🎨 Modern UI & Design    | Fluid HSL design tokens with polished dark/light theme    |
| 🔤 Google Typography     | Plus Jakarta Sans & JetBrains Mono for crisp readability  |
| 📱 Responsive Layout     | Fully optimized across mobile, tablet, and widescreen     |
| 🔥 Firebase Contact Form | Contact messages stored securely using Firestore          |
| 🌤️ Weather Dashboard    | Real-time weather data with geolocation & 5-day forecast  |
| 📊 API Dashboard         | Real HTTP API monitoring with response status and latency |
| ✅ Todo Application       | Task management with browser persistence                  |
| 📂 Project Showcase      | Organized collection of live standalone projects          |
| 🏷️ Version Control      | Semantic versioning with Git tags                         |
| 🚀 CI/CD Deployment      | Automatic deployment using GitHub Actions                 |

---

## 🛠️ Tech Stack

### Frontend & UI
* HTML5 & Vanilla JavaScript (ES6+ Modules, Touch & Mouse Gestures)
* Custom Design System (HSL Color Variables, Glassmorphism, Responsive Grid/Flex)
* Ambient Graphics & Audio (Interactive Particle Canvas, Web Audio API Synthesizer)
* Google Fonts (Plus Jakarta Sans & JetBrains Mono)

### Backend & AI Services
* Express 4 Server (`server.ts` with `tsx` dev runner and `esbuild` production bundler)
* Google Gemini 2.5 Flash API (`/api/chat` multi-turn assistant endpoint)
* Firebase Firestore (Cloud persistence for contact form submissions)
* Open-Meteo API (High-precision meteorology & reverse geocoding)
* Public REST APIs (GitHub, JSONPlaceholder, HTTP status prober)

### Tooling & Build System
* Vite 6 Multi-Page Application (MPA) Pipeline
* TypeScript 5.8 (Strict type checking)
* Git & GitHub Actions (Automated CI/CD deployment)

---

## 📁 Project Structure

```
Portfolio/
│
├── index.html
├── about.html
├── projects.html
├── contact.html
├── favicon.svg
├── Muhammad_Zaheer_Resume.pdf
├── README.md
│
├── css/
│   └── style.css
│
├── js/
│   ├── script.js
│   ├── firebase.js
│   └── portfolio-links.js
│
├── images/
│   ├── muhammad-zaheer.jpg
│   └── MEss.jpeg
│
├── projects/
│   ├── weather-app/
│   ├── weather-dashboard/
│   ├── todo-app/
│   ├── api-dashboard/
│   └── shared/
│
└── .github/
    └── workflows/
        └── static.yml
```

---

## 🏷️ Version History

| Version    | Release Notes                                                                |
| ---------- | ---------------------------------------------------------------------------- |
| **v3.3.0** | Improve weather dashboard location detection, refine city suggestions, and enhance local testing workflow |
| **v3.2.0** | Migrate weather dashboard to Open-Meteo API, soundscapes, GPS-friendly location names, and refined light theme |
| **v3.1.0** | Add live weather-scene animations to the dashboard |
| **v3.0.0** | Major UI redesign, HSL dark/light design system, Google typography, privacy updates, and MEss profile |
| **v2.1.3** | Fix: Use OpenWeatherMap reverse geocoding for accurate city detection               |
| **v2.1.2** | Update projects page - reorder projects and open Weather Dashboard in new tab       |
| **v2.1.1** | Fix: Correct geolocation to display Islamabad instead of Allahabad                  |
| **v2.1.0** | Add Weather Dashboard with live API integration and 5-day forecast                  |
| **v2.0.0** | Add Firebase Firestore contact form with form validation                            |
| **v1.0.0** | Initial portfolio release with GitHub Pages deployment                              |

---

## 🚀 Run Locally

### Option 1: Full-Stack (Vite + Express + Gemini AI)

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/mzaheer1070/Portfolio.git
   cd Portfolio
   npm install
   ```

2. *(Optional)* Set up your environment variable for Gemini AI in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

### Option 2: Static Server (Client-Only Preview)

If running without Node/Express:
```bash
python3 -m http.server 8000
# or npx serve
```
Open `http://localhost:8000` in your browser.

---

## 🔒 Security

* Firestore rules restrict database access.
* Contact submissions are create-only.
* Visitors cannot read, update, or delete submitted messages.

---

## 🤝 Feedback

Suggestions and improvements are welcome. Feel free to open an issue or share feedback about the project.

⭐ If you find this project interesting, consider giving it a star!
