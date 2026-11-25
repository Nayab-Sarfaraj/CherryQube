"use client";

import { useState } from "react";
import { dateTimeParts, localDateTimeWithOffset } from "./date-time";

export function DateTimeField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange(value: string): void;
}) {
  const initial = dateTimeParts(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  function change(nextDate: string, nextTime: string) {
    onChange(localDateTimeWithOffset(nextDate, nextTime) ?? "");
  }

  return (
    <fieldset>
      <legend className="font-medium">Date and time</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="event-date" className="block text-sm">
            Date
          </label>
          <input
            id="event-date"
            type="date"
            required
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              change(event.target.value, time);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "event-date-time-error" : undefined}
            className="mt-1 w-full rounded-lg border border-ink/40 bg-white p-3"
          />
        </div>
        <div>
          <label htmlFor="event-time" className="block text-sm">
            Time
          </label>
          <input
            id="event-time"
            type="time"
            required
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              change(date, event.target.value);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "event-date-time-error" : undefined}
            className="mt-1 w-full rounded-lg border border-ink/40 bg-white p-3"
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/70">
        Your device&apos;s time zone is used when you change the date or time.
      </p>
      {error && (
        <p id="event-date-time-error" className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );
}
