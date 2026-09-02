import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEffect, type ReactNode } from "react";

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
      // PWA instalável (ADR-09) — sem service worker nesta rodada, de
      // propósito: só ícone/nome corretos ao "Adicionar à tela de início" e
      // abertura em tela cheia, não app offline (isso é outro projeto).
      { name: "theme-color", content: "#6c2cba" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Financeiro" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/newicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
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
 * `null` = ainda verificando; `true` = tem token e ele é válido; `false` =
 * sem token, ou token que o backend rejeitou. Nunca lança — um 401/qualquer
 * falha de rede aqui significa "sem sessão", não é um erro pra propagar.
 */
async function verificarSessao(): Promise<boolean> {
  if (!sessao.ler()) return false;
  try {
    await api.eu();
    return true;
  } catch {
    return false;
  }
}

/**
 * Checa a sessão antes de deixar qualquer rota de dado renderizar (ADR-02,
 * ADR-03). Sem SSR de propósito — `localStorage` só existe no navegador, e
 * um loader de servidor não teria como ler o token sem um mecanismo de
 * propagação adicional que esta integração decidiu não introduzir. Por
 * isso a checagem mora aqui, num `useQuery` (só roda no cliente), não num
 * `beforeLoad`/loader de rota.
 *
 * É `useQuery`, não `useState` + `useEffect` de propósito: um `useEffect`
 * com `[]` só roda uma vez, no mount — depois de um login bem-sucedido em
 * `/login`, nada o refazia, e o `navigate({ to: "/" })` do login era
 * imediatamente desfeito por este componente, que continuava achando que
 * não havia sessão (bug real, só um reload "consertava" porque remontava
 * tudo). Com `useQuery`, `login.tsx` chama `invalidateQueries` e **espera**
 * a sessão ser reconferida com o token novo antes de navegar — sem essa
 * corrida.
 */
function PortaoDeSessao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: sessaoValida, status } = useQuery({
    queryKey: ["sessao"],
    queryFn: verificarSessao,
    staleTime: Infinity,
  });

  useEffect(() => {
    // Um 401 em qualquer chamada (ver api-client.ts) chama isto — desloga
    // na hora, sem esperar a próxima verificação de sessão.
    return sessao.observarExpiracao(() => queryClient.setQueryData(["sessao"], false));
  }, [queryClient]);

  const autenticado = status === "pending" ? null : (sessaoValida ?? false);

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
