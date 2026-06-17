---
name: marca-pagina setup
description: Stack, credenciais e estado do projeto marca·página
type: project
---

App chamado **marca·página** — PWA de biblioteca pessoal de leituras.

**Stack:** React 18 + Vite + Tailwind CSS 3 + Supabase + Vercel

**Repositório:** https://github.com/jetrodesigner-collab/marca-pagina

**Supabase project URL:** https://qzyntdtnwmwsqhnruton.supabase.co

**Referência visual:** `marca-pagina-FINAL.html` na raiz do projeto — contém todas as telas e componentes do design (tema claro/escuro, glassmorphism, blobs, font Figtree).

**Estrutura criada:**
- `src/App.jsx` — componente raiz, controla sessão Supabase e alterna entre Login/Signup/app logado
- `src/main.jsx` — entry point
- `src/index.css` — Tailwind + CSS vars do design (light/dark) + classes das telas de auth (`.lcard`, `.finp`, `.cw`/`.ct`/`.ct2` carrossel, `c1-c9`/`f1-f6` capas)
- `src/lib/supabase.js` — cliente Supabase
- `src/components/AuthShell.jsx` — layout compartilhado das telas de auth (blobs, carrossel, logo, tagline)
- `src/components/CoverCarousel.jsx` — carrossel animado de capas (duas fileiras, direções opostas)
- `src/pages/Login.jsx` — login + recuperação de senha (toggle inline)
- `src/pages/Signup.jsx` — cadastro (username + email + senha)
- `vite.config.js` — React + vite-plugin-pwa
- `.env.local` — variáveis Supabase (não commitado)

**Fase 1:** Concluída — projeto criado, push no GitHub, deploy no Vercel configurado.

**Fase 2:** Concluída — tela de Login (S1) implementada: carrossel animado, logo "marca·página", glass card com email/senha, "Entrar →", "Continuar com Google", "Esqueci minha senha" (recuperação inline) e "Criar agora" (cadastro). Ações ligadas ao Supabase: `signInWithPassword`, `signInWithOAuth({provider:'google'})`, `signUp`, `resetPasswordForEmail`. Commit `db0a14e`, já no `origin/main`.

**Why:** Projeto novo sendo construído do zero com deploy automático via Vercel + GitHub, seguindo o design de `marca-pagina-FINAL.html` tela por tela.

**How to apply:** Telas de autenticação (Login/Signup) são sempre renderizadas em tema escuro fixo (`.dark` no wrapper), independente do toggle de tema do app — a marca usa fundo escuro #1A1720 / accent #C4A8F0 como identidade de entrada. Próxima etapa (Fase 3): tela S2 (Biblioteca), que hoje é só um placeholder pós-login em `App.jsx`. Reaproveitar as classes `c1-c9`/`f1-f6` (capas) e `.gc`/`.bc` (cards) do `marca-pagina-FINAL.html` ao construí-la.
