"use client";

import { useOrganization } from "@/contexts/organization-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export function StaffSettingsClient() {
  const { currentOrg } = useOrganization();

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
          <h3 className="text-lg font-medium">Gestión del Equipo</h3>
          <p className="text-gray-600">
            Gestiona el personal del restaurante y sus permisos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No team members yet
            </h3>
            <p className="mt-2 text-gray-600">
              Get started by inviting your first team member.
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
