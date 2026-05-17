import React, { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px 24px', maxWidth: 520, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Κάτι πήγε στραβά</h2>
          <p className="muted" style={{ marginBottom: 24 }}>Αυτή η σελίδα αντιμετώπισε πρόβλημα. Οι υπόλοιπες σελίδες λειτουργούν κανονικά.</p>
          <pre className="panel-card" style={{ textAlign: 'left', fontSize: '0.75rem', padding: 12, overflowX: 'auto', marginBottom: 24 }}>
            {this.state.error.message}
          </pre>
          <button className="btn" onClick={() => this.setState({ error: null })}>
            Δοκίμασε ξανά
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
