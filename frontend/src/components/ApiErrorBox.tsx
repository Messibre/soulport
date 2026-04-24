type ApiErrorBoxProps = {
  title?: string;
  message: string;
  requestId?: string;
  hint?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  retryLabel?: string;
};

export function ApiErrorBox({
  title = "Request failed",
  message,
  requestId,
  hint,
  onRetry,
  retryDisabled = false,
  retryLabel = "Retry",
}: ApiErrorBoxProps) {
  return (
    <div className="alert alert-warning mt-3">
      <div className="w-full">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
        {hint && <p className="mt-1 text-xs opacity-90">Tip: {hint}</p>}
        {requestId && (
          <p className="mt-2 text-xs font-mono font-semibold text-warning-content">
            Request ID: {requestId}
          </p>
        )}
        {onRetry && (
          <div className="mt-3">
            <button
              className="btn btn-sm btn-warning"
              onClick={onRetry}
              disabled={retryDisabled}
            >
              {retryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
