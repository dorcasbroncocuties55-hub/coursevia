type Props = {
  service: any;
  onBook?: (service: any) => void;
};

export default function ProviderServiceCard({ service, onBook }: Props) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{service.title}</h3>
          <p className="text-sm text-slate-500">
            {service.duration_minutes || 60} mins
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500">Price</div>
          <div className="text-lg font-bold">
            ${Number(service.price || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        {service.description || "Professional support session."}
      </p>

      <button
        onClick={() => onBook?.(service)}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        Book This Service
      </button>
    </div>
  );
}