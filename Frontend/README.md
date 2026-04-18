# Frontend - OnlineShop

Frontend-ul aplicației OnlineShop construit cu Next.js 15, React 19, TypeScript și Tailwind CSS.

## Tehnologii

- **Next.js 15.2.6** - Framework React
- **React 19** - Library UI
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componente UI
- **Lucide React** - Iconițe

## Instalare

```bash
npm install
```

## Rulare în modul development

```bash
npm run dev
```

Aplicația va rula pe `http://localhost:3000` (sau alt port dacă 3000 este ocupat).

## Build pentru producție

```bash
npm run build
npm start
```

## Structura proiectului

```
Frontend/
├── app/                    # Next.js App Router
│   ├── register/          # Pagina de înregistrare
│   ├── login/             # Pagina de autentificare
│   ├── admin/             # Pagina admin
│   ├── seller/            # Pagina seller
│   ├── checkout/          # Pagina checkout
│   ├── product/[id]/      # Pagina produs
│   └── review/            # Pagina review
├── components/            # Componente React
│   ├── ui/               # Componente UI (shadcn)
│   └── theme-provider.tsx
├── lib/                   # Utilități și helpers
├── hooks/                 # Custom React hooks
├── public/               # Fișiere statice
└── styles/               # Stiluri globale
```

## Pagini disponibile

- `/` - Homepage
- `/register` - Înregistrare utilizator
- `/login` - Autentificare
- `/admin` - Dashboard admin
- `/seller` - Dashboard seller
- `/checkout` - Checkout
- `/product/[id]` - Detalii produs
- `/review` - Review produse

## Dezvoltare

### Adăugare componente UI noi

Proiectul folosește shadcn/ui. Pentru a adăuga componente noi:

```bash
npx shadcn@latest add [component-name]
```

### Linting

```bash
npm run lint
```

## Variabile de mediu

Creează un fișier `.env.local` în rădăcina folderului Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Integration

Backend-ul rulează pe `http://localhost:8000`. Toate request-urile către API se fac prin `/api/*` endpoints.
