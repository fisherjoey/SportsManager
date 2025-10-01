export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page Not Found</p>
        <p className="mt-2 text-sm text-gray-500">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
