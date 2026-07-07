import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  GraduationCap, User,
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";

export default function AppLayout() {
  const location = useLocation();
  const { t } = useI18n();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("nav.home") },
    { path: "/practice", icon: BookOpen, label: t("nav.practice") },
    { path: "/foundation", icon: BookOpen, label: t("nav.learn") },
    { path: "/study-guide", icon: FileText, label: t("nav.plan") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          {/* Logo + Nav */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/" className="flex items-center gap-2 mr-2 sm:mr-4 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-background" />
              </div>
              <span className="font-display font-bold text-foreground hidden sm:block">StudyTutor</span>
            </Link>
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:block">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Language + Profile */}
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link
              to="/profile"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                location.pathname === "/profile"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}