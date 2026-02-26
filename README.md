<div align="center">
  <h1 align="center">PSskal</h1>
  <h3>La plataforma open-source todo-en-uno para gestión de restaurantes.</h3>
</div>

<div align="center">
  <a href="https://github.com/yourusername/restauranteapp/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/yourusername/restauranteapp"></a>
  <a href="https://github.com/yourusername/restauranteapp/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <a href="https://x.com/PSskal"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/PSskal"></a>
  <a href="https://web.facebook.com/PSskal/"><img alt="Facebook" src="https://img.shields.io/badge/Facebook-PSskal-blue?logo=facebook"></a>
  <a href="https://www.tiktok.com/@paskalcode"><img alt="TikTok" src="https://img.shields.io/badge/TikTok-@paskalcode-black?logo=tiktok"></a>
</div>

<br/>

## 🎬 Demo

<div align="center">
  <video src="public/_static/psskalRestaurant.mp4" controls width="600">
    Tu navegador no soporta el elemento de video.
  </video>
</div>

> **Ver el video:** [Demo completa](public/_static/psskalRestaurant.mp4)

PSskal es una plataforma de código abierto que integra landing page, menú digital con QR, punto de venta (POS), gestión de pedidos y cocina en un solo flujo conectado. Perfecta para restaurantes que buscan digitalizar sus operaciones sin complicaciones.

## ✨ Características Principales

- **🍽️ Menú Digital con QR:** Permite a tus clientes ver el menú desde su móvil escaneando un código QR personalizado por mesa.
- **💳 Punto de Venta (POS):** Terminal de punto de venta completo con carrito, descuentos y gestión de pagos.
- **📱 Pedidos en Tiempo Real:** Sincronización automática de pedidos desde el menú digital hacia la cocina.
- **👨‍🍳 Vista de Cocina:** Dashboard especializado para que el equipo de cocina visualice y gestione los pedidos activos.
- **🪑 Gestión de Mesas:** Editor de plano de piso drag-and-drop para organizar mesas, secciones y configuraciones.
- **👥 Gestión de Personal:** Control de empleados, roles, permisos y asignación de mesas.
- **📊 Reportes y Análisis:** Visualización de ventas, productos más vendidos, rendimiento por período y más.
- **🎨 Branding Personalizado:** Personaliza colores, logos y dominios para reflejar la identidad de tu marca.
- **🔐 Autenticación Multi-organización:** Soporte para múltiples restaurantes con roles y permisos granulares.
- **📧 Notificaciones por Email:** Sistema de invitaciones y notificaciones automáticas via Resend.
- **☁️ Almacenamiento en la Nube:** Carga de imágenes para menú integrada con Vercel Blob.
- **🌍 Open-source & Self-hosted:** Aloja la plataforma en tu propio servidor y personalízala según tus necesidades.

## 🎯 Planes

- **Plan Free:** Ideal para restaurantes pequeños con funcionalidades básicas.
  - 1 restaurante
  - 3 empleados
  - Menú digital ilimitado
  - Gestión básica de mesas
- **Plan Premium:** Desbloquea todo el potencial con POS completo, reportes avanzados y sin límites.
  - Restaurantes ilimitados
  - 30+ empleados
  - POS completo
  - Reportes avanzados
  - Branding personalizado
  - **Prueba Pro GRATIS por 14 días** _(no requiere tarjeta)_

## 🛠️ Stack Tecnológico

- [Next.js](https://nextjs.org/) – Framework React
- [TypeScript](https://www.typescriptlang.org/) – Lenguaje tipado
- [Tailwind CSS](https://tailwindcss.com/) – Estilos
- [shadcn/ui](https://ui.shadcn.com) – Componentes UI
- [Prisma](https://prisma.io) – ORM [![Made with Prisma](https://made-with.prisma.io/dark.svg)](https://prisma.io)
- [PostgreSQL](https://www.postgresql.org/) – Base de datos
- [NextAuth.js](https://next-auth.js.org/) – Autenticación
- [Resend](https://resend.com) – Emails
- [Vercel Blob](https://vercel.com/storage/blob) – Almacenamiento de archivos
- [Recharts](https://recharts.org) – Gráficos y visualizaciones
- [Vercel](https://vercel.com/) – Hosting

## 🚀 Inicio Rápido

### Requisitos Previos

Necesitarás tener instalado lo siguiente:

- Node.js (versión >= 18.17.0)
- Base de datos PostgreSQL
- Cuenta en [Resend](https://resend.com) (para envío de emails)
- Cuenta en [Vercel Blob](https://vercel.com/storage/blob) (para almacenamiento de imágenes)

### 1. Clonar el repositorio

```shell
git clone https://github.com/yourusername/restauranteapp.git
cd restauranteapp
```

### 2. Instalar dependencias

```shell
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```shell
cp .env.example .env
```

Edita el archivo `.env` con tus valores:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/restaurante"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui"

# Resend (Email)
RESEND_API_KEY="tu-resend-api-key"

# Vercel Blob (Storage)
BLOB_READ_WRITE_TOKEN="tu-blob-token"

# Cloudinary (opcional, alternativa a Blob)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"
```

### 4. Inicializar la base de datos

```shell
npx prisma migrate dev
npx prisma generate
```

### 5. Poblar datos iniciales (opcional)

```shell
npx prisma db seed
```

### 6. Ejecutar el servidor de desarrollo

```shell
npm run dev
```

### 7. Abrir la aplicación

Visita [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Comandos Disponibles

```shell
npm run dev          # Inicia el servidor de desarrollo con Turbopack
npm run build        # Construye la aplicación para producción
npm run start        # Inicia el servidor de producción
npm run lint         # Ejecuta el linter
npx prisma studio    # Abre Prisma Studio para gestionar la BD
```

## 🔧 Configuración de Prisma

Para gestionar tu base de datos visualmente:

```shell
npx prisma studio
```

Para crear una nueva migración después de cambios en el schema:

```shell
npx prisma migrate dev --name nombre_de_tu_migracion
```

## 📝 Estructura del Proyecto

```
restauranteapp/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   └── migrations/            # Migraciones de BD
├── public/
│   └── _static/               # Recursos estáticos (logos, imágenes)
├── src/
│   ├── app/                   # App Router de Next.js
│   │   ├── (auth)/           # Rutas de autenticación
│   │   ├── (dashboard)/      # Panel de administración
│   │   ├── (landing)/        # Landing page pública
│   │   ├── (public)/         # Páginas públicas (menú, invitaciones)
│   │   └── api/              # API Routes
│   ├── components/           # Componentes React reutilizables
│   │   ├── menu/            # Componentes del menú digital
│   │   ├── mesas/           # Editor de plano de piso
│   │   ├── orders/          # Dashboard de pedidos
│   │   ├── pos/             # Terminal POS
│   │   ├── kitchen/         # Vista de cocina
│   │   └── ui/              # Componentes UI de shadcn
│   ├── lib/                  # Utilidades y configuraciones
│   └── types/                # Tipos de TypeScript
└── package.json
```

## 🤝 Contribuir

PSskal es un proyecto de código abierto y damos la bienvenida a contribuciones de la comunidad.

Si deseas contribuir:

1. Haz un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commitea tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## 📞 Soporte

¿Tienes preguntas o necesitas ayuda?

- Abre un [Issue](https://github.com/yourusername/restauranteapp/issues)
- Síguenos en [Twitter](https://x.com/PSskal)
- Síguenos en [TikTok](https://www.tiktok.com/@paskalcode)
- Síguenos en [Facebook](https://web.facebook.com/PSskal/)

---

<div align="center">
  Hecho con ❤️ para la comunidad restaurantera
</div>
