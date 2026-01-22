
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Simple Error Boundary to catch crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-10 text-slate-900 font-sans">
          <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
            <h1 className="text-2xl font-black mb-4 text-red-600">Something went wrong.</h1>
            <p className="text-slate-600 mb-6">The application encountered a critical error and could not render.</p>
            <div className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-60 mb-6">
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
