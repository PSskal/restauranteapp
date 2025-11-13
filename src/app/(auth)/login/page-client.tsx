"use client";

import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

import { toast } from "sonner";

import { signInWithGoogle } from "@/lib/auth-actions";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";

import Google from "@/components/shared/icons/google";
import { LogoCloud } from "@/components/shared/logo-cloud";
import { Button } from "@/components/ui/button";

export default function Login() {
  useAuthRedirect(); // Redirigir automáticamente si ya está logueado

  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex h-screen w-full flex-wrap">
      {/* Left part */}
      <div className="flex w-full justify-center bg-gray-50 md:w-1/2 lg:w-1/2">
        <div
          className="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        ></div>
        <div className="z-10 mx-5 mt-[calc(1vh)] h-fit w-full max-w-md overflow-hidden rounded-lg sm:mx-0 sm:mt-[calc(2vh)] md:mt-[calc(3vh)]">
          <div className="items-left flex flex-col space-y-3 px-4 py-6 pt-8 sm:px-12">
            <div className="-mt-8 mb-16 self-start sm:mb-20">
              <h1 className="text-5xl font-bold text-gray-900">PSskal</h1>
            </div>
            <Link href="/">
              <span className="text-balance text-3xl font-semibold text-gray-900">
                Bienvenido a PSskal
              </span>
            </Link>
            <h3 className="text-balance text-lg text-gray-800">
              Devolviendo el control a tu restaurante.
            </h3>
          </div>

          <div className="flex flex-col space-y-4 px-4 pt-12 sm:px-12">
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  await signInWithGoogle();
                } catch {
                  toast.error("Error al iniciar sesión con Google");
                }
                setIsLoading(false);
              }}
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center space-x-3 rounded-lg border-2 border-gray-300 bg-white font-medium text-gray-900 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-50"
            >
              <Google className="h-6 w-6" />
              <span className="text-base">
                {isLoading ? "Iniciando sesión..." : "Continuar con Google"}
              </span>
            </Button>
          </div>

          <p className="mt-12 w-full max-w-md px-4 text-xs text-muted-foreground sm:px-12">
            Al continuar, aceptas haber leído y estar de acuerdo con los{" "}
            <a href="/terms" target="_blank" className="underline">
              Términos de Servicio
            </a>{" "}
            y la{" "}
            <a href="/privacy" target="_blank" className="underline">
              Política de Privacidad
            </a>{" "}
            de PSskal.
          </p>
        </div>
      </div>
      <div className="relative hidden w-full justify-center overflow-hidden bg-black md:flex md:w-1/2 lg:w-1/2">
        <div className="relative m-0 flex h-full min-h-[700px] w-full p-0">
          <div
            className="relative flex h-full w-full flex-col justify-between"
            id="features"
          >
            {/* Testimonial top 2/3 */}
            <div
              className="flex w-full flex-col items-center justify-center"
              style={{ height: "66.6666%" }}
            >
              {/* Image container */}
              <div className="mb-4 h-64 w-80">
                <Image
                  className="h-full w-full rounded-2xl object-cover shadow-2xl"
                  src="/_static/testimonials/personalRestaurante.webp"
                  alt="Backtrace Capital"
                  width={320}
                  height={256}
                />
              </div>
              {/* Text content */}
              <div className="max-w-xl text-center">
                <blockquote className="text-balance font-normal leading-8 text-white sm:text-xl sm:leading-9">
                  <p>
                    &quot;PSskal nos devolvió el control total de nuestro menú
                    digital. Simple, rápido y sin complicaciones.&quot;
                  </p>
                </blockquote>
                <figcaption className="mt-4">
                  <div className="text-balance font-normal text-white">
                    Chef Propietario
                  </div>
                  <div className="text-balance font-light text-gray-400">
                    Restaurante Gourmet
                  </div>
                </figcaption>
              </div>
            </div>
            {/* White block with logos bottom 1/3, full width/height */}
            <div
              className="absolute bottom-0 left-0 flex w-full flex-col items-center justify-center bg-white"
              style={{ height: "33.3333%" }}
            >
              <div className="mb-4 max-w-xl text-balance text-center font-semibold text-gray-900">
                Instituciones gastronómicas que confían en nosotros
              </div>
              <LogoCloud />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
