"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChefHat, Clock, MapPin, Phone, Utensils } from "lucide-react";

interface Table {
  id: string;
  number: number;
  qrToken: string;
  organization: {
    id: string;
    name: string;
  };
}

export default function TablePage() {
  const params = useParams();
  const token = params.token as string;

  const [table, setTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTable = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/table/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Mesa no encontrada");
          } else if (response.status === 410) {
            setError("Esta mesa no está disponible");
          } else {
            setError("Error al cargar la mesa");
          }
          return;
        }

        const data = await response.json();
        setTable(data.table);
      } catch (error) {
        console.error("Error fetching table:", error);
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchTable();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Cargando mesa...</p>
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Utensils className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">
              {error || "Mesa no encontrada"}
            </CardTitle>
            <CardDescription>
              Por favor verifica el código QR o contacta al restaurante.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header del restaurante */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {table.organization.name}
            </h1>
            <p className="text-gray-600 mt-1">
              ¡Bienvenido! Haz tu pedido desde tu mesa
            </p>
            <Badge variant="outline" className="mt-2">
              Mesa {table.number}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Tarjeta de bienvenida */}
          <Card className="border-orange-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <ChefHat className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">
                ¡Bienvenido a {table.organization.name}!
              </CardTitle>
              <CardDescription>
                Estás en la Mesa {table.number}. Aquí podrás ver nuestro menú y
                hacer tu pedido.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Estado del menú */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Sistema en desarrollo</span>
                </div>
                <p className="text-gray-600">
                  El menú digital y sistema de pedidos estará disponible
                  próximamente.
                </p>
                <p className="text-sm text-gray-500">
                  Por el momento, puedes llamar al mesero para hacer tu pedido.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Acciones disponibles */}
          <div className="space-y-3">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              size="lg"
              disabled
            >
              <Utensils className="h-5 w-5 mr-2" />
              Ver Menú (Próximamente)
            </Button>

            <Button variant="outline" className="w-full" size="lg" disabled>
              <Clock className="h-5 w-5 mr-2" />
              Hacer Pedido (Próximamente)
            </Button>
          </div>

          {/* Información adicional */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Mesa {table.number}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Para pedidos, llama al mesero
                </span>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500">
                  Token de mesa: {table.qrToken}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
