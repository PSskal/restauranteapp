import { auth } from "@/auth";

export default async function AuthTest() {
  const session = await auth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth.js Configuration Test</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Environment Variables Check:
        </h2>
        <ul className="space-y-1">
          <li>
            ✅ AUTH_SECRET: {process.env.AUTH_SECRET ? "Set" : "❌ Missing"}
          </li>
          <li>
            ✅ AUTH_GOOGLE_ID:{" "}
            {process.env.AUTH_GOOGLE_ID ? "Set" : "❌ Missing"}
          </li>
          <li>
            ✅ AUTH_GOOGLE_SECRET:{" "}
            {process.env.AUTH_GOOGLE_SECRET ? "Set" : "❌ Missing"}
          </li>
          <li>
            ✅ AUTH_RESEND_KEY:{" "}
            {process.env.AUTH_RESEND_KEY ? "Set" : "❌ Missing"}
          </li>
          <li>
            ✅ AUTH_RESEND_FROM:{" "}
            {process.env.AUTH_RESEND_FROM ? "Set" : "❌ Missing"}
          </li>
          <li>✅ AUTH_URL: {process.env.AUTH_URL ? "Set" : "❌ Missing"}</li>
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Session:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {session ? JSON.stringify(session, null, 2) : "No active session"}
        </pre>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold mb-2">Test Links:</h2>
        <div className="space-x-4">
          <a
            href="/api/auth/signin/google"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Google Sign In
          </a>
          <a
            href="/api/auth/signout"
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Test Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
