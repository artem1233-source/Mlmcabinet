import AppRu from './AppRu';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppRu />
    </ErrorBoundary>
  );
}