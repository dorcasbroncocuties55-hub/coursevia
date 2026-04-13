const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Props = {
  availability?: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
};

export default function ProviderAvailabilityCard({
  availability = [],
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Availability</h3>

      {!availability.length ? (
        <p className="text-sm text-slate-500">
          No availability added yet.
        </p>
      ) : (
        <div className="space-y-3">
          {availability.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3"
            >
              <span className="font-medium">
                {days[slot.day_of_week] || "Day"}
              </span>
              <span className="text-sm text-slate-600">
                {slot.start_time} - {slot.end_time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}