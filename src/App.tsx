import AppRu from './AppRu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DemoUserProvider } from './contexts/DemoUserContext';

export default function App() {
  return (
    <ErrorBoundary>
      <DemoUserProvider>
        <AppRu />
      </DemoUserProvider>
    </ErrorBoundary>
  );
}