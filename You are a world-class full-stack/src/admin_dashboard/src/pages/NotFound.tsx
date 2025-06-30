import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500" />
        </div>
        
        <h1 className="mt-6 text-6xl font-bold text-gray-900 dark:text-white">
          404
        </h1>
        
        <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Page not found
        </h2>
        
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Sorry, we couldn't find the page you're looking for.
        </p>
        
        <div className="mt-8">
          <Link
            to="/"
            className="btn btn-primary"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
