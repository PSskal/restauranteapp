import { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  ChefHat,
  Smartphone,
  QrCode,
  Users,
  RefreshCw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Características | PSskal",
  description:
    "Descubre todas las características de PSskal: menú digital con QR, POS completo, gestión de pedidos, cocina sincronizada y análisis en tiempo real.",
};

const features = [
  {
    icon: QrCode,
    title: "Menú Digital con QR",
    description:
      "Los comensales escanean el código QR de la mesa y acceden al menú completo desde su celular. Sin apps, sin esperas, sin papel.",
    benefits: [
      "Actualización instantánea de precios y disponibilidad",
      "Imágenes de alta calidad de cada plato",
      "Búsqueda y filtros por categoría",
      "Disponible 24/7 sin costo de impresión",
    ],
  },
  {
    icon: Smartphone,
    title: "POS Completo",
    description:
      "Sistema de punto de venta diseñado específicamente para restaurantes. Rápido, intuitivo y siempre disponible.",
    benefits: [
      "Interfaz táctil optimizada para velocidad",
      "Métodos de pago: efectivo y tarjeta",
      "Gestión de mesas en tiempo real",
      "Historial completo de transacciones",
    ],
  },
  {
    icon: RefreshCw,
    title: "Pedidos Sincronizados",
    description:
      "Todos los pedidos, ya sean desde el QR o el POS, llegan automáticamente a cocina. Cero papeles, cero errores de comunicación.",
    benefits: [
      "Sincronización automática en tiempo real",
      "Notificaciones instantáneas a cocina",
      "Estado de pedido visible para todo el equipo",
      "Reducción de tiempos de espera",
    ],
  },
  {
    icon: ChefHat,
    title: "Vista de Cocina",
    description:
      "Panel dedicado para que tu equipo de cocina vea todos los pedidos pendientes y gestione la preparación de forma ordenada.",
    benefits: [
      "Priorización automática por tiempo",
      "Actualización de estado: Preparando, Listo, Servido",
      "Vista clara de cada pedido con notas especiales",
      "Control total del flujo de producción",
    ],
  },
  {
    icon: Users,
    title: "Gestión de Personal",
    description:
      "Asigna roles específicos a cada miembro del equipo: dueño, gerente, cajero, mesero o cocina. Cada quien ve solo lo que necesita.",
    benefits: [
      "5 roles con permisos diferenciados",
      "Invitaciones por email seguras",
      "Control de acceso por funcionalidad",
      "Seguimiento de actividad por usuario",
    ],
  },
  {
    icon: BarChart3,
    title: "Reportes y Analíticas",
    description:
      "Visualiza el rendimiento de tu restaurante con reportes detallados: ventas, platos más vendidos, horarios pico y más.",
    benefits: [
      "Dashboard con métricas clave en tiempo real",
      "Reportes de ventas por período",
      "Análisis de platos más y menos vendidos",
      "Exportación de datos para contabilidad",
    ],
  },
];

export default function CaracteristicasPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-card border-b">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Todo lo que necesitas para gestionar tu restaurante
            </h1>
            <p className="text-xl text-muted-foreground">
              PSskal integra todas las herramientas esenciales en una sola
              plataforma: desde el menú digital hasta reportes avanzados.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 md:gap-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`grid md:grid-cols-2 gap-8 items-center ${
                    index % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className={index % 2 === 1 ? "md:order-2" : ""}>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">{feature.title}</h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-muted-foreground">
                            {benefit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={`bg-muted rounded-2xl aspect-[4/3] ${
                      index % 2 === 1 ? "md:order-1" : ""
                    }`}
                  >
                    {/* Placeholder para imagen */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card border-y py-20">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para transformar tu restaurante?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comienza gratis hoy y descubre cómo PSskal puede optimizar tu
            operación desde el primer día.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold transition-colors"
            >
              Empieza gratis
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-muted text-foreground hover:bg-muted/80 font-semibold transition-colors"
            >
              Ver precios
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
