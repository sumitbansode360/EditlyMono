/**
 * Formats a date string into a human-readable relative format.
 * Industry standard: "just now", "X minutes ago", "X hours ago", "yesterday", or "Dec 12".
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  
  // Get difference in milliseconds
  const diffInMs = now.getTime() - date.getTime();
  
  // Calculate unit differences
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);

  // Future-proofing (if the server time is slightly ahead of local time)
  if (diffInMs < 0) return "just now";

  // 1. Just now: Within the last 60 seconds
  if (diffInSecs < 60) {
    return "just now";
  }

  // 2. Minutes ago: Within the last hour
  if (diffInMins < 60) {
    return `${diffInMins} minute${diffInMins === 1 ? "" : "s"} ago`;
  }

  // Check calendar status (Today/Yesterday)
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  // 3. Hours ago: If the edit was today, show relative hours
  if (isToday) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  // 4. Yesterday: Specifically mention "yesterday" with the exact time
  if (isYesterday) {
    return `yesterday at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  // 5. Calendar Date: For anything older than yesterday
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    // Only show the year if it's not the current year (Standard SaaS UI cleanup)
    ...(isThisYear ? {} : { year: "numeric" }),
  });
};
