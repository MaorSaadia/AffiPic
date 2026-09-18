import {
  LayoutDashboard,
  Package,
  Shapes,
  Store,
  Layers,
  BookOpen,
  Settings2,
  ChartNoAxesCombined,
  CreditCard,
} from "lucide-react";
export const navigation = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/dashboard/products", icon: Package },
  { title: "Categories", href: "/dashboard/categories", icon: Shapes },
  { title: "Merchants", href: "/dashboard/merchants", icon: Store },
  { title: "Collections", href: "/dashboard/collections", icon: Layers },
  { title: "Guides", href: "/dashboard/guides", icon: BookOpen },
  { title: "Website Settings", href: "/dashboard/settings", icon: Settings2 },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,
  },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
] as const;
