"use client";

import { useSession } from "next-auth/react";
import { useOrganization } from "@/contexts/organization-context";

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const { currentOrg, organizations } = useOrganization();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug de Autenticación</h1>

      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Estado de Sesión</h2>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Organizaciones</h2>
          <p>
            <strong>Org Actual:</strong> {currentOrg?.name || "Ninguna"}
          </p>
          <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify({ currentOrg, organizations }, null, 2)}
          </pre>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Test API</h2>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
            onClick={async () => {
              try {
                const response = await fetch("/api/organizations");
                const data = await response.json();
                console.log("Organizations API:", data);
                alert("Ver consola para resultados");
              } catch (error) {
                console.error("Error:", error);
                alert("Error: " + error);
              }
            }}
          >
            Test Organizations API
          </button>

          {currentOrg && (
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={async () => {
                try {
                  const response = await fetch(
                    `/api/organizations/${currentOrg.id}/tables`
                  );
                  const data = await response.json();
                  console.log("Tables API:", data);
                  alert("Ver consola para resultados");
                } catch (error) {
                  console.error("Error:", error);
                  alert("Error: " + error);
                }
              }}
            >
              Test Tables API
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
