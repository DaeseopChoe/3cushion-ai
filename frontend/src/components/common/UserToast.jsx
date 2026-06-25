import React from "react";

/** Non-blocking USER feedback — bottom toast or center notice. */
export default function UserToast({ message, visible, variant = "default" }) {
  if (!visible || !message) return null;
  const className =
    variant === "center" ? "user-toast user-toast--center" : "user-toast";
  return (
    <div className={className} role="status" aria-live="polite">
      {message}
    </div>
  );
}
