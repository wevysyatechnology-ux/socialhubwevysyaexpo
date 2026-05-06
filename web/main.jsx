import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './app.css';

const TARGET_URL = 'https://socialhub.wevysya.com';
const logo = '/assets/WeVysya Logo New Branding.png';

function SplashScreen({ opacity }) {
  return (
    <div className="splash-overlay" style={{ opacity }}>
      <div className="splash-background">
        <div className="ring ring-small" />
        <div className="ring ring-medium" />
        <div className="ring ring-large" />
        <div className="light-streak light-streak-left" />
        <div className="light-streak light-streak-right" />
        <div className="aura aura-large" />
        <div className="aura aura-core" />
      </div>

      <div className="splash-content">
        <div className="top-section">
          <div className="logo-wrap">
            <img src={logo} alt="WeVysya Logo" className="logo" />
          </div>
          <div className="brand-block">
            <p className="title">WeVysya Social Hub</p>
            <p className="subtitle">
              Generate flyers &amp; manage our community presence
            </p>
          </div>
        </div>

        <div className="bottom-section">
          <div className="tagline-block">
            <p className="tagline-line">Stop Thinking &apos;i&apos;,</p>
            <p className="tagline-line">
              Start Thinking <span className="tagline-accent">&apos;WE&apos;</span>
            </p>
          </div>

          <div className="progress-track">
            <div className="progress-fill shimmer" />
          </div>

          <p className="powered-by">Powered by WeVysya</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashOpacity, setSplashOpacity] = useState(1);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashOpacity(0);
    }, 1000);

    const hideTimer = setTimeout(() => {
      setSplashVisible(false);
    }, 1220);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="container">
      <iframe
        src={TARGET_URL}
        className="webview-iframe"
        title="WeVysya Social Hub"
        allow="camera; microphone; clipboard-write"
      />
      {splashVisible && <SplashScreen opacity={splashOpacity} />}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
