import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        // We could log to an error reporting service here
    }

    handleReset = () => {
        // Attempt to clear the potentially corrupted state
        // This is a "Nuclear Option" for the user to get back to work
        if (window.confirm("This will clear your current sheet data to recover the app. Are you sure?")) {
            localStorage.removeItem('chevruta_sources');
            localStorage.removeItem('chevruta_title');
            this.setState({ hasError: false, error: null });
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b'
                }}>
                    <h1 style={{ marginBottom: '1rem' }}>Something went wrong.</h1>
                    <p style={{ maxWidth: '500px', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        The application encountered an unexpected error. This usually happens when a text source has an invalid format.
                    </p>
                    <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fff', border: '1px solid #f87171', borderRadius: '4px', textAlign: 'left', width: '100%', maxWidth: '600px', overflow: 'auto' }}>
                        <code style={{ fontSize: '0.9rem' }}>{this.state.error && this.state.error.toString()}</code>
                    </div>
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Reset App Data & Recover
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            backgroundColor: 'transparent',
                            color: '#7f1d1d',
                            border: '1px solid #7f1d1d',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Try Reloading (Might Crash Again)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
