export function useAnalytics() {
  const capture = (event: string, properties?: Record<string, unknown>) => {
    // Placeholder for analytics tracking
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics]", event, properties);
    }
  };

  return { capture };
}
