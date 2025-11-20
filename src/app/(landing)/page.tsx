"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  BarChart3,
  ChefHat,
  Clock,
  Globe,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const trustPoints = [
  { label: "Sincronización segura", icon: ShieldCheck },
  { label: "Datos en vivo 24/7", icon: Sparkles },
  { label: "Soporte en español", icon: Globe },
];

const features = [
  {
    id: "pos",
    label: "Punto de Venta",
    image: "/_static/preview/pos.jpeg",
  },
  { id: "menu", label: "Menú Digital", image: "/_static/preview/cartaqr.jpeg" },
  { id: "orders", label: "Pedidos", image: "/_static/preview/qrmesas.jpeg" },
  {
    id: "kitchen",
    label: "Cocina",
    image: "/_static/preview/vistacocina.jpeg",
  },
  {
    id: "branding",
    label: "Branding",
    image: "/_static/preview/branding.jpeg",
  },
  {
    id: "tables",
    label: "Gestión de Mesas",
    image: "/_static/preview/gestion-mesa.jpeg",
  },
  {
    id: "staff",
    label: "Gestión de Personal",
    image: "/_static/preview/gestion-personal.jpeg",
  },
  { id: "reports", label: "Reportes", image: "/_static/preview/reportes.jpeg" },
];
export default function Home() {
  const [activeFeature, setActiveFeature] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8 ">
          <div className="flex flex-col items-start text-left max-w-4xl">
            {/* Trust badges arriba */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline" className="border-slate-200">
                <Star className="mr-1 h-3 w-3 fill-orange-400 text-orange-400" />
                <Star className="mr-1 h-3 w-3 fill-orange-400 text-orange-400" />
                <Star className="mr-1 h-3 w-3 fill-orange-400 text-orange-400" />
                <Star className="mr-1 h-3 w-3 fill-orange-400 text-orange-400" />
                <Star className="mr-2 h-3 w-3 fill-orange-400 text-orange-400" />
                Confiado por +120 restaurantes
              </Badge>
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <Badge
                    key={point.label}
                    variant="outline"
                    className="border-slate-200"
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {point.label}
                  </Badge>
                );
              })}
            </div>

            {/* Título y descripción */}
            <div className="mt-12 space-y-6">
              <h1 className="text-5xl font-bold leading-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Landing, pedidos y POS en un solo flujo conectado
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl">
                PSskal reemplaza múltiples herramientas con una plataforma que
                atrae comensales, muestra tu carta en vivo y convierte cada
                visita en un pedido listo para cocina.
              </p>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col gap-4">
              <Button size="lg" className="w-fit px-8 rounded-full" asChild>
                <Link href="/dashboard">
                  Comenzar gratis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-slate-500">
                No pedimos tarjeta · Prueba completa por 14 días
              </p>
            </div>

            {/* Logos de marcas */}
            <div className="mt-20 w-full">
              <div className="flex flex-wrap items-center gap-x-16 gap-y-10 opacity-60">
                <Image
                  src="/_static/logo/UPC_logo_transparente.png"
                  alt="UPC"
                  width={200}
                  height={80}
                  className="h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
                <Image
                  src="/_static/logo/logo_cenfotur.svg"
                  alt="CENFOTUR"
                  width={200}
                  height={80}
                  className="h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
                <Image
                  src="/_static/logo/LOGOH.png"
                  alt="Partner"
                  width={200}
                  height={80}
                  className="h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
              </div>
            </div>
          </div>
          {/* Platform preview section */}
          <div className="flex flex-col items-center bg-muted/30 px-8 py-16">
            <div className="w-full max-w-6xl">
              {/* Dashboard preview image */}
              <div className="mb-8 overflow-hidden rounded-lg border bg-white shadow-2xl">
                <Image
                  src={
                    features.find((f) => f.id === activeFeature)?.image ||
                    features[0].image
                  }
                  alt="PSskal Dashboard"
                  width={1200}
                  height={700}
                  className="h-auto w-full"
                  priority
                />
              </div>

              {/* Feature buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`rounded-full px-6 py-3 text-sm font-medium transition-colors ${
                      activeFeature === feature.id
                        ? "bg-foreground text-background"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {feature.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <div className="flex flex-col items-center px-8 py-24 bg-white">
        <div className="w-full max-w-6xl">
          <h2 className="mb-16 text-balance text-center text-4xl font-bold md:text-5xl">
            Construido para restaurantes modernos.{" "}
            <span className="text-muted-foreground">
              Gestiona tu restaurante con herramientas que realmente funcionan
              juntas.
            </span>
          </h2>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {/* Menú QR en tiempo real */}
            <div className="flex flex-col gap-4">
              <QrCode className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">Menú QR en tiempo real</h3>
              <p className="text-muted-foreground">
                Tus comensales siempre ven platos disponibles. Actualiza desde
                el POS y el QR se sincroniza al instante.
              </p>
            </div>

            {/* Pedidos sincronizados */}
            <div className="flex flex-col gap-4">
              <RefreshCw className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">Pedidos sincronizados</h3>
              <p className="text-muted-foreground">
                Desde el landing público hasta la cocina, todo fluye sin papeles
                ni mensajes perdidos.
              </p>
            </div>

            {/* Branding personalizado */}
            <div className="flex flex-col gap-4">
              <Sparkles className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">Branding personalizado</h3>
              <p className="text-muted-foreground">
                Tu landing refleja la identidad de tu restaurante con colores,
                logo y descripción únicos.
              </p>
            </div>

            {/* Analítica detallada */}
            <div className="flex flex-col gap-4">
              <BarChart3 className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">Analítica detallada</h3>
              <p className="text-muted-foreground">
                Reportes de ventas, platos populares y horarios pico para tomar
                decisiones basadas en datos.
              </p>
            </div>

            {/* Vista de cocina */}
            <div className="flex flex-col gap-4">
              <Clock className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">
                Vista de cocina optimizada
              </h3>
              <p className="text-muted-foreground">
                Comandas claras con tiempos de preparación y estado de cada
                pedido en pantalla dedicada.
              </p>
            </div>

            {/* Operación veloz */}
            <div className="flex flex-col gap-4">
              <Zap className="h-10 w-10 text-foreground" />
              <h3 className="text-xl font-semibold">Operación veloz</h3>
              <p className="text-muted-foreground">
                Reduce tiempos muertos entre salón y cocina con notificaciones
                automáticas y estados en vivo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ section */}
      <div className="flex flex-col items-center bg-white px-8 py-24">
        <div className="w-full max-w-3xl">
          <h2 className="mb-12 text-3xl font-bold">
            FAQ <span className="text-muted-foreground">PSskal</span>
          </h2>

          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="item-1"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left text-lg">
                ¿Qué es PSskal?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                PSskal es una plataforma integral para restaurantes que conecta
                tu menú digital, POS, pedidos y cocina en un solo flujo.
                Gestiona todo desde la landing pública hasta la comanda en
                cocina.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left text-lg">
                ¿Cómo empiezo a usar PSskal?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Crea tu cuenta gratis, registra tu restaurante, sube tu menú y
                activa tu landing personalizada. En menos de 10 minutos puedes
                empezar a recibir pedidos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left text-lg">
                ¿PSskal es gratis?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí, ofrecemos un plan gratuito completo para restaurantes
                pequeños. También tenemos planes Premium con características
                avanzadas para operaciones más grandes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left text-lg">
                ¿Puedo personalizar el branding de mi landing?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí, puedes personalizar colores, logo, descripción y agregar
                fotos de tus platos. Tu landing refleja la identidad única de tu
                restaurante.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left text-lg">
                ¿Cómo funciona el menú QR?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Genera códigos QR para cada mesa. Los comensales escanean y ven
                tu carta en vivo. Si pausas un plato desde el POS, el QR se
                actualiza automáticamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left text-lg">
                ¿Necesito equipo especial?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No, PSskal funciona en cualquier dispositivo con navegador web.
                Usa tablets, teléfonos o computadoras para el POS, cocina y
                gestión.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left text-lg">
                ¿Quién puede usar PSskal?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Restaurantes, cafeterías, food trucks, bares y cualquier negocio
                gastronómico que quiera digitalizar su operación y mejorar la
                experiencia del cliente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left text-lg">
                ¿Qué reportes puedo obtener?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Accede a reportes de ventas diarias, platos más populares,
                horarios pico, desempeño por mesero y analítica de tu carta
                pública.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {funnelSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={`funnel-${step.title}`}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center"
              >
                <div className="rounded-2xl bg-orange-50 p-4 text-orange-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-500">
                    {step.highlight}
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {step.title}
                  </p>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-slate-900 px-8 py-10 text-white">
          <div>
            <p className="text-sm uppercase tracking-wide text-orange-200">
              Lista para usar
            </p>
            <p className="text-3xl font-semibold">
              Entra a tu dashboard, crea tu restaurante y activa tu landing en
              menos de 10 minutos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/dashboard">Crear organización</Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-white" asChild>
              <Link href="/restaurantes">Explorar ejemplos</Link>
            </Button>
          </div>
        </div>
      </section> */}
    </div>
  );
}
