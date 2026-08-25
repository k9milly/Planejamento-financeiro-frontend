import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { api } from "@/lib/api-client";
import { sessao } from "@/lib/sessao";
import { PeriodProvider } from "@/components/finance/period-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Planejamento Financeiro" },
      {
        name: "description",
        content: "Dashboard de planejamento financeiro pessoal com lançamentos, análises e metas.",
      },
      { property: "og:title", content: "Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Controle entradas, saídas, orçamentos e metas em um painel moderno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PeriodProvider>
        <PortaoDeSessao />
        <Toaster />
      </PeriodProvider>
    </QueryClientProvider>
  );
}

/**
 * Checa a sessão antes de deixar qualquer rota de dado renderizar (ADR-02,
 * ADR-03). Sem SSR de propósito — `localStorage` só existe no navegador, e
 * um loader de servidor não teria como ler o token sem um mecanismo de
 * propagação adicional que esta integração decidiu não introduzir. Por
 * isso a checagem mora aqui, num `useEffect` (só roda no cliente), não num
 * `beforeLoad`/loader de rota.
 */
function PortaoDeSessao() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // null = ainda verificando o token guardado.
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    sessao.observarExpiracao(() => setAutenticado(false));

    if (!sessao.ler()) {
      setAutenticado(false);
      return;
    }
    api
      .eu()
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  useEffect(() => {
    if (autenticado === false && pathname !== "/login") {
      navigate({ to: "/login" });
    }
    if (autenticado === true && pathname === "/login") {
      navigate({ to: "/" });
    }
  }, [autenticado, pathname, navigate]);

  if (autenticado === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sessão…</p>
      </div>
    );
  }

  // Required: nested routes render here. Removing <Outlet /> breaks all child routes.
  return <Outlet />;
}
