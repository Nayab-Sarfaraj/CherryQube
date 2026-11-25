"use client";

export function ReplyContactReminder({
  method,
}: {
  method: "email" | "whatsapp" | "sms";
}) {
  function focusContact() {
    const input = document.getElementById("contact-value");
    input?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    input?.focus({ preventScroll: true });
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-white/80 p-4">
      <p className="font-medium">One detail needed before saving</p>
      <p className="mt-1 text-sm">
        Add {method === "email" ? "an email address" : "a phone number"} guests
        can use to reply. It&apos;s required to save or export this invitation.
      </p>
      <button
        type="button"
        onClick={focusContact}
        className="mt-2 font-medium text-accent underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-accent"
      >
        Add reply details
      </button>
    </div>
  );
}
