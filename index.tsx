
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 協助調試：捕捉啟動錯誤
window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.error("SmartLedger Error:", msg, error);
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("Render failed:", err);
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">啟動失敗，請檢查瀏覽器主控台 (F12)。</div>`;
}
