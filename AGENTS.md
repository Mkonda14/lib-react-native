# Expo v57 — React Native component library

Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6.0.
NativeWind v4 + Tailwind CSS 3 + shadcn/ui component pattern.

## Commands

- `npm run start` — Expo dev server
- `npm run lint` — `expo lint` (eslint-config-expo flat config)
- `npm run android` / `npm run ios` / `npm run web` — platform launchers

No test runner or typecheck script configured. No CI.

## Architecture

File-based routing via **expo-router**. Entry: `app/_layout.tsx`.

```
app/
  _layout.tsx          — root: GestureHandler > SafeArea > AuthProvider > ToastProvider > Stack
  index.tsx            — session gate: redirects to (auth) or (protected)
  global.css           — Tailwind directives + CSS variable theme (light/dark)
  (auth)/              — unauthenticated screens (sign-in, sign-up, etc.)
  (protected)/         — RequireAuth wrapper → (tabs)/
components/
  ui/                  — shadcn-style primitives (button, input, dialog, form, etc.)
  custom/              — domain-specific (business.tsx)
lib/
  utils.ts             — cn() = clsx + tailwind-merge
  api-fetcher/         — zero-dep HTTP client (src/ is the source, no npm package)
  better-auth-rn/      — internal auth package (see below)
hooks/                 — kebab-case source files (use-color-scheme.ts)
theme/                 — Colors object + spacing constants
providers/             — mode-provider.tsx (light/dark toggle context)
```

## Auth: `@your-org/auth-rn`

NOT an npm dependency. Lives at `lib/better-auth-rn/packages/auth-rn/`.
Imported via tsconfig path alias `@your-org/auth-rn` → `./lib/better-auth-rn/packages/auth-rn/src`.

Key facts:
- Bearer token auth (no cookies). Backend at `EXPO_PUBLIC_BACKEND_URL`.
- MMKV v3 only (`react-native-mmkv@^3.3.3`). **Do NOT upgrade to v4** — requires Nitro Modules, breaks Expo Go.
- SecureStore for refresh/access tokens. MMKV for session cache + TOTP secrets.
- Deep link scheme: `mypharmacymobile` (app config) / `libreactnative` (app.json).
- `registerNavigator()` must be called once in root layout for redirects to work.

## NativeWind setup

- Babel: `babel-preset-expo` with `jsxImportSource: "nativewind"` + `nativewind/babel` preset.
- Metro: `withNativeWind(config, { input: './app/global.css' })`.
- Tailwind content paths: `app/`, `components/`, `lib/better-auth-rn/packages/auth-rn/src/`.
- Theme uses CSS variables (`--background`, `--primary`, etc.) defined in `app/global.css`.

## Theming: two systems

1. **Tailwind/NativeWind** — CSS variables in `app/global.css` (`.dark` class toggles).
2. **Programmatic** — `theme/colors.ts` exports `Colors.light` / `Colors.dark` for RN components that can't use Tailwind.

Both must stay in sync when adding new semantic colors.

## Hooks convention

Hooks exist in two forms: kebab-case source + camelCase re-export.
Example: `hooks/use-color-scheme.ts` (real logic) → `hooks/useColor.ts` (`export { useColorScheme } from './use-color'`).
Always edit the kebab-case file.

## Android emulator gotcha

`localhost` and `127.0.0.1` don't reach the host machine on Android emulator. The root layout auto-rewrites to `10.0.2.2`. If `EXPO_PUBLIC_BACKEND_URL` contains `localhost` on Android, it's replaced at runtime.

## Component conventions

- Use `cn()` from `@/lib/utils` for class merging (never raw `clsx` alone).
- Components use `forwardRef` + `data-slot` attribute pattern.
- Forms: react-hook-form v7 + zod + `@hookform/resolvers`. Use `<Form>`, `<FormField>`, `<FormItem>`, `<FormSubmit>` from `@/components/ui/form`.
- Icons: `lucide-react-native`.

## Versioned docs

Expo API surface changes between SDK versions. When in doubt, check https://docs.expo.dev/versions/v54.0.0/.
