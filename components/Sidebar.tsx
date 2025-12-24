'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BarChart3,
  FlaskConical,
  Package,
  PackageCheck,
  Box,
  Beaker,
  Factory,
  Tags,
  DollarSign,
  Users,
  ShoppingCart,
  FolderTree,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Raw Materials', href: '/raw-materials', icon: FlaskConical },
      { name: 'Bulk Products', href: '/bulk-products', icon: Package },
      { name: 'Finished Products', href: '/finished-products', icon: PackageCheck },
      { name: 'Packaging', href: '/packaging', icon: Box },
    ],
  },
  {
    title: 'Production',
    items: [
      { name: 'Formulations', href: '/formulations', icon: Beaker },
      { name: 'Production', href: '/production', icon: Factory },
      { name: 'Batches', href: '/batches', icon: Tags },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { name: 'Sales', href: '/sales', icon: DollarSign },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Categories', href: '/categories', icon: FolderTree },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[hsl(var(--sidebar-border))]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-[hsl(var(--sidebar-foreground))]">Skincare ERP</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigationGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer - Theme Toggle */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
          {mounted && (
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark Mode
                </>
              )}
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--sidebar-background))] shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile menu header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[hsl(var(--sidebar-border))]">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold text-[hsl(var(--sidebar-foreground))]">Skincare ERP</span>
            </Link>
            <Button
              onClick={() => setMobileMenuOpen(false)}
              variant="ghost"
              size="icon"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile menu items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {navigationGroups.map((group) => (
              <div key={group.title} className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile footer */}
          <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
            {mounted && (
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          variant="ghost"
          size="icon"
          className="bg-background/90 backdrop-blur-sm shadow-sm border border-border"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  );
}

