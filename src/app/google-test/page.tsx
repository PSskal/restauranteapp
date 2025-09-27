"use client";

import { useEffect, useState } from "react";

export default function GoogleAuthTest() {
  const [authUrl, setAuthUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Test if we can access the auth endpoint
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data) => {
        console.log("Available providers:", data);
        if (data.google) {
          console.log("Google provider is available!");
        } else {
          setError("Google provider not found in configuration");
        }
      })
      .catch((err) => {
        console.error("Error fetching providers:", err);
        setError("Failed to fetch auth providers: " + err.message);
      });

    // Test direct access to Google signin
    fetch("/api/auth/signin/google")
      .then((res) => {
        console.log("Google signin endpoint status:", res.status);
        if (res.status === 200) {
          setAuthUrl("/api/auth/signin/google");
        }
      })
      .catch((err) => {
        console.error("Error accessing Google signin:", err);
        setError("Failed to access Google signin endpoint: " + err.message);
      });
  }, []);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">
        Google Auth Configuration Test
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Environment Check:</h2>
          <code className="block bg-gray-100 p-2 rounded mt-2">
            Google ID:{" "}
            {process.env.NEXT_PUBLIC_DEBUG
              ? "Visible in browser"
              : "Hidden (secure)"}
          </code>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Direct Test Links:</h2>
          <div className="space-y-2 mt-2">
            <a
              href="/api/auth/providers"
              target="_blank"
              className="block bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200"
            >
              1. Test Providers Endpoint
            </a>
            <a
              href="/api/auth/signin"
              target="_blank"
              className="block bg-green-100 text-green-800 px-4 py-2 rounded hover:bg-green-200"
            >
              2. Test Sign In Page
            </a>
            <a
              href="/api/auth/signin/google"
              className="block bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-red-200"
            >
              3. Test Google Sign In (This should redirect to Google)
            </a>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800">Expected Behavior:</h3>
          <ol className="list-decimal list-inside text-yellow-700 mt-2 space-y-1">
            <li>Link 1 should show available providers (including Google)</li>
            <li>Link 2 should show the default Auth.js sign in page</li>
            <li>Link 3 should redirect you to Google's OAuth page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
