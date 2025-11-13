export const PLAN_IDS = ["FREE", "PREMIUM"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanCopy {
  id: PlanId;
  name: string;
  priceLabel: string;
  pricePerMonth: number;
  currency: string;
  description: string;
  ribbon?: string;
  highlight?: boolean;
}

export const PLAN_CARDS: Record<PlanId, PlanCopy> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceLabel: "S/0",
    pricePerMonth: 0,
    currency: "S/",
    description: "Empieza gratis con todo lo básico para operar un restaurante pequeño.",
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    priceLabel: "S/50",
    pricePerMonth: 50,
    currency: "S/",
    description: "Escala tu operación con automatizaciones, POS completo y reportes avanzados.",
    ribbon: "Más popular",
    highlight: true,
  },
};

export interface PlanLimits {
  restaurants: number | null;
  staffSeats: number;
  tables: number | null;
  menuItems: number | null;
  categories: number | null;
  monthlyOrders: number | null;
  allowBranding: boolean;
  allowQrRegeneration: boolean;
  allowBatchQrPrint: boolean;
  allowImageUpload: boolean;
  allowStockManagement: boolean;
  allowPos: boolean;
  allowPosCartControls: boolean;
  allowPosSearch: boolean;
  allowOrderHistory: boolean;
  allowStatusNotifications: boolean;
  allowReportsAdvanced: boolean;
  allowCloudStorage: boolean;
  allowPrioritySupport: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: {
    restaurants: 1,
    staffSeats: 1,
    tables: 3,
    menuItems: 10,
    categories: 3,
    monthlyOrders: 50,
    allowBranding: false,
    allowQrRegeneration: false,
    allowBatchQrPrint: false,
    allowImageUpload: false,
    allowStockManagement: false,
    allowPos: false,
    allowPosCartControls: false,
    allowPosSearch: false,
    allowOrderHistory: false,
    allowStatusNotifications: false,
    allowReportsAdvanced: false,
    allowCloudStorage: false,
    allowPrioritySupport: false,
  },
  PREMIUM: {
    restaurants: null,
    staffSeats: 10,
    tables: null,
    menuItems: null,
    categories: null,
    monthlyOrders: null,
    allowBranding: true,
    allowQrRegeneration: true,
    allowBatchQrPrint: true,
    allowImageUpload: true,
    allowStockManagement: true,
    allowPos: true,
    allowPosCartControls: true,
    allowPosSearch: true,
    allowOrderHistory: true,
    allowStatusNotifications: true,
    allowReportsAdvanced: true,
    allowCloudStorage: true,
    allowPrioritySupport: true,
  },
};

type FeatureValue =
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string };

export interface PlanFeatureRow {
  key: string;
  label: string;
  helper?: string;
  values: Record<PlanId, FeatureValue>;
}

export interface PlanFeatureSection {
  category: string;
  features: PlanFeatureRow[];
}

export const PLAN_FEATURE_SECTIONS: PlanFeatureSection[] = [
  {
    category: "Restaurantes / Organizaciones",
    features: [
      {
        key: "orgs",
        label: "Restaurantes/Organizaciones",
        values: {
          FREE: { type: "text", value: "1 restaurante" },
          PREMIUM: { type: "text", value: "Ilimitado" },
        },
      },
      {
        key: "staff-seats",
        label: "Usuarios por organización",
        values: {
          FREE: { type: "text", value: "1 usuario" },
          PREMIUM: { type: "text", value: "10 usuarios" },
        },
      },
      {
        key: "branding",
        label: "Branding personalizado (logo, colores)",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Mesas y QR",
    features: [
      {
        key: "tables",
        label: "Gestión de mesas",
        values: {
          FREE: { type: "text", value: "3 mesas" },
          PREMIUM: { type: "text", value: "Ilimitadas" },
        },
      },
      {
        key: "qr-per-table",
        label: "Códigos QR por mesa",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "toggle-table",
        label: "Habilitar/deshabilitar mesas",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "qr-regenerate",
        label: "Regenerar códigos QR",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "qr-print",
        label: "Imprimir QR individuales",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "qr-batch-print",
        label: "Imprimir QR en lote",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Menú y productos",
    features: [
      {
        key: "menu-items",
        label: "Productos en menú",
        values: {
          FREE: { type: "text", value: "10 productos" },
          PREMIUM: { type: "text", value: "Ilimitados" },
        },
      },
      {
        key: "menu-categories",
        label: "Categorías de menú",
        values: {
          FREE: { type: "text", value: "3 categorías" },
          PREMIUM: { type: "text", value: "Ilimitadas" },
        },
      },
      {
        key: "category-management",
        label: "Gestión de categorías (orden, nombre)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "product-toggle",
        label: "Activar/desactivar productos",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "image-upload",
        label: "Subida de imágenes de productos",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "stock-management",
        label: "Gestión de stock por producto",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "public-menu",
        label: "Menú público por QR",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "menu-search",
        label: "Búsqueda de productos en menú",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "menu-filters",
        label: "Filtros por categoría",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Pedidos",
    features: [
      {
        key: "monthly-orders",
        label: "Pedidos mensuales",
        values: {
          FREE: { type: "text", value: "50 pedidos" },
          PREMIUM: { type: "text", value: "Ilimitados" },
        },
      },
      {
        key: "qr-orders",
        label: "Pedidos desde mesa (QR)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-orders",
        label: "Pedidos desde POS (punto de venta)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "cart",
        label: "Carrito de compras",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "order-notes",
        label: "Notas en pedidos",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "order-statuses",
        label: "Estados de pedido (PLACED, PREPARING, READY, SERVED)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "order-history",
        label: "Historial de pedidos",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-table-assignment",
        label: "Asignar mesa a pedido POS",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "status-updates",
        label: "Cambio de estado de pedidos",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "status-notifications",
        label: "Notificaciones de cambio de estado",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "order-repeat",
        label: 'Función "Pedir de nuevo"',
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Punto de venta (POS)",
    features: [
      {
        key: "pos-terminal",
        label: "Terminal POS",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-cart",
        label: "Carrito POS con control de cantidades",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-table-selection",
        label: "Asignación de mesa desde POS",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-search",
        label: "Búsqueda de productos en POS",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-filters",
        label: "Filtros por categoría en POS",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "pos-responsive",
        label: "Vista móvil responsive",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Experiencia del cliente",
    features: [
      {
        key: "public-menu-responsive",
        label: "Menú público responsive",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "live-tracking",
        label: "Seguimiento de pedido en tiempo real",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "order-confirmation",
        label: "Modal de confirmación de pedido",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "status-indicators",
        label: "Indicadores visuales de estado",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "device-recovery",
        label: "Recuperación de pedido en dispositivo",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "device-privacy",
        label: "Privacidad por dispositivo",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "mobile-optimized",
        label: "Vista optimizada móvil/tablet",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Dashboard y reportes",
    features: [
      {
        key: "basic-dashboard",
        label: "Dashboard con estadísticas básicas",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "active-tables",
        label: "Total de mesas habilitadas",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "active-products",
        label: "Productos activos",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "menu-categories-metric",
        label: "Categorías de menú",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "restaurant-health",
        label: "Estado general del restaurante",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "advanced-reports",
        label: "Reportes avanzados de ventas",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "top-products",
        label: "Reporte de productos más vendidos",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Seguridad y permisos",
    features: [
      {
        key: "auth",
        label: "Autenticación de usuarios (Clerk)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "org-management",
        label: "Gestión de organizaciones",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "roles",
        label: "Roles de usuario (Owner, Admin, Staff)",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "permissions",
        label: "Permisos por rol",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Tecnología",
    features: [
      {
        key: "web-platform",
        label: "Plataforma web",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "mobile-responsive",
        label: "Responsive móvil",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "tablet-responsive",
        label: "Responsive tablet",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "cloud-storage",
        label: "Almacenamiento en la nube (Vercel Blob)",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "database",
        label: "Base de datos PostgreSQL",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    category: "Soporte",
    features: [
      {
        key: "email-support",
        label: "Soporte por email",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "priority-support",
        label: "Soporte prioritario",
        values: {
          FREE: { type: "boolean", value: false },
          PREMIUM: { type: "boolean", value: true },
        },
      },
      {
        key: "auto-updates",
        label: "Actualizaciones automáticas",
        values: {
          FREE: { type: "boolean", value: true },
          PREMIUM: { type: "boolean", value: true },
        },
      },
    ],
  },
];

export const DEFAULT_PLAN: PlanId = "FREE";
