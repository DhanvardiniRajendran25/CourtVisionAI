export default function LoadingSpinner({ className = '' }) {
  return (
    <div
      className={`inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
