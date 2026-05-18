export function EditorAlertModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  const stopModalEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      onPointerDown={stopModalEvent}
      onPointerMove={stopModalEvent}
      onPointerUp={stopModalEvent}
      onPointerCancel={stopModalEvent}
      onClick={stopModalEvent}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl font-bold text-amber-600">
          !
        </div>
        <h2 className="text-lg font-bold text-pelican-navy">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-pelican-teal px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
