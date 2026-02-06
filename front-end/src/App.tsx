import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Website</h1>
        <p>React + TypeScript + Vite + Bun</p>
      </header>
      <main className="app-main">
        <div className="counter">
          <p>Count: {count}</p>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            Increment
          </button>
        </div>
      </main>
    </div>
  );
}
