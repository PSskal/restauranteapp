"use client";

import { useOrganization } from "@/contexts/organization-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, QrCode, Copy, Edit } from "lucide-react";
import { useState } from "react";

export function TablesSettingsClient() {
  const { currentOrg } = useOrganization();
  const [tables, setTables] = useState([
    { id: 1, number: 1, qrToken: "abc123", status: "active" },
    { id: 2, number: 2, qrToken: "def456", status: "active" },
    { id: 3, number: 3, qrToken: "ghi789", status: "inactive" },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");

  const handleAddTable = () => {
    if (newTableNumber.trim()) {
      const newTable = {
        id: tables.length + 1,
        number: parseInt(newTableNumber),
        qrToken: Math.random().toString(36).substring(7),
        status: "active",
      };
      setTables([...tables, newTable]);
      setNewTableNumber("");
      setShowAddForm(false);
    }
  };

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Loading organization data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Mesas del Restaurante</h3>
          <p className="text-gray-600">Gestiona tus mesas y códigos QR</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showAddForm ? "Cancelar" : "Agregar Mesa"}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Table Number</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleAddTable}>Create Table</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {tables.map((table) => (
          <Card key={table.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="font-semibold">Table {table.number}</h4>
                    <p className="text-sm text-gray-500">
                      Token: {table.qrToken}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        table.status === "active"
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm">
                      {table.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">Table URL:</p>
                <p className="font-mono text-sm break-all">
                  {typeof window !== "undefined" &&
                    `${window.location.origin}/table/${table.qrToken}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
