# Kyl2AI

Matsvinn-app: kylskåp/skafferi, inköpslista, vane-inlärning, hållbarhetspåminnelser
och AI-genererade recept. Byggd med Expo Router + expo-sqlite, local-first.

## Kom igång

```bash
npm install
npx expo start
```

Öppna i Expo Go på din telefon (skanna QR-koden), eller kör i simulator.

Fungerar direkt i Expo Go:

- Kylskåp/skafferi med manuell inmatning, ~25 förinlästa varor med hållbarhetsdata
- Inköpslista, grupperad efter avdelning
- Vane-inlärning (ren SQL-aggregering över köphistorik, inget ML)
- Lokala hållbarhetspåminnelser (`expo-notifications`)
- Recept-generator (kräver antingen din Supabase Edge Function eller en egen AI-nyckel i Inställningar)
- Butiker + drag-and-drop-ordning på avdelningar

Kräver en **development build** (`eas build --profile development`), fungerar inte i Expo Go:

- Geofencing (`services/geofencing.ts`) — `expo-location` + `expo-task-manager` bakgrundsbevakning.
  iOS begränsar detta till max ~20 regioner och kan strypa uppdateringsfrekvensen; testa på riktig
  enhet tidigt.

## Innan produktion

1. **Supabase Edge Function-URL**: byt ut placeholdern i `services/ai/provider.ts`
   (`SUPABASE_FUNCTIONS_URL`) mot din riktiga URL när `generate-recipe` och
   `recognize-items` är deployade.
2. **App-ikoner**: `assets/images/*.png` är genererade platshållare (solid teal, 1024×1024).
   Ersätt med riktig ikon/adaptive-icon/splash innan du kör `eas build`.
3. **Kamera-UI**: `services/ai/visionAI.ts` har fungerande logik för kvitto- och hyllfoto-tolkning
   (komprimerar bild, anropar vision-modell, tolkar JSON-svar), men det finns ännu ingen
   kameraskärm som anropar den — det är nästa steg när du vill lägga till kvittoscanning.

## Datamodell

SQLite (`db/schema.ts`): `items`, `fridge_entries`, `purchase_history`, `shopping_list`,
`stores`, `departments`. Se `db/queries/*` för alla frågor. `stores.department_order` är
en JSON-array av avdelnings-id i den ordning användaren drar dem i Inställningar → Butiker.

Inköpslistan sorteras just nu efter avdelningarnas globala `sort_order`, inte per butik —
en naturlig utökning är att låta `shopping-list.tsx` ta emot en vald butik och sortera efter
dess `department_order` istället.

## Mappstruktur

```
app/
  _layout.tsx          -- root: fonts, splash, db-init, introanimation
  (tabs)/               -- Kylskåp / Inköpslista / Recept / Inställningar
  item/[id].tsx          -- redigera en skafferivara
  stores/                -- butiker + avdelningsordning (drag-and-drop)
db/
  schema.ts, client.ts
  queries/               -- fridge, shoppingList, habits, stores
  seed/shelfLifeData.ts   -- inbyggd hållbarhetsdatabas (~25 varor)
services/
  notifications.ts, geofencing.ts
  ai/                     -- keyStore (secure-store), provider (BYOK/default), recipeAI, visionAI
components/
  IntroAnimation.tsx      -- pseudo-3D kylskåpsdörr som öppnas vid appstart
  ...
```

## Design

Ljus kylig bakgrund, grafit för struktur, teal som tech-accent, korall reserverat för
"går snart ut". Space Grotesk (rubriker/UI) + JetBrains Mono (siffror/nedräkningar) via
`@expo-google-fonts/*`. Se `constants/theme.ts` för hela paletten.

## EAS Build

`eas.json` har profiler för `development` (krävs för geofencing/bakgrundsuppgifter),
`preview` och `production`. Kör `eas build --profile development` från terminalen (bygget
själv körs i molnet).
