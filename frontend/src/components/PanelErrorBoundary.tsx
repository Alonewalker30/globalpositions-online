import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}] panel error:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500, #64748b)' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>{this.props.name}</strong> encountered an error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid currentColor' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
