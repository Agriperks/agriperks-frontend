import React from 'react';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Static method to update state when an error occurs
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Catch errors and log them
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const { t } = this.props; // Access t from props since we can't use hooks in a class

    if (this.state.hasError) {
      return (
        <div className="container mx-auto p-4 text-center text-red-500">
          <h2 className="text-2xl font-bold mb-4">{t('error.title')}</h2>
          <p>{this.state.error?.message || t('error.message')}</p>
          <button
            className="mt-4 bg-farmGreen text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => window.location.reload()}
            aria-label={t('error.reload')}
          >
            {t('error.reload')}
          </button>
        </div>
      );
    }

    return this.props.children; // No React.Fragment needed here
  }
}

// Wrap the class component with a functional component to use the useTranslation hook
const ErrorBoundaryWithTranslation = (props) => {
  const { t } = useTranslation();
  return <ErrorBoundary {...props} t={t} />;
};

export default ErrorBoundaryWithTranslation;