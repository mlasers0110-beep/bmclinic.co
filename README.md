# MySkinCode — System Kodowania i Wieloparametrowej Analizy Skóry (MSC-MATRIX)

**MySkinCode** to nowoczesna aplikacja webowa i mobilna (PWA) wspomagająca diagnostykę dermokosmetyczną oraz personalizację pielęgnacji w oparciu o autorski system klasyfikacji **MSC-MATRIX**. Aplikacja łączy 10-etapowy wywiad kliniczny z interaktywnym **Laboratorium Parametrów Skóry**, umożliwiając wybór badanych wskaźników biofizycznych, definiowanie własnych parametrów gabinetowych, analizę odchyleń od normy oraz monitorowanie postępów terapii w czasie.

---

## Najważniejsze funkcje

### 1. Kodowanie kliniczne MSC-MATRIX (9 klas × 4 stopnie)
- Automatyczne przypisanie jedno- lub dwufenotypowego kodu skóry w formacie `MSC-[FENOTYP]-[STOPIEŃ]` lub `MSC-[FENOTYP]-[STOPIEŃ]/[FENOTYP]-[STOPIEŃ]` (np. `MSC-SEB-G2/VAS-G1`).
- Ocena 9 fenotypów klinicznych oraz 4 stopni zaawansowania zmian (`G0`–`G3`).

### 2. Konfiguracja i zmiana badanych parametrów skóry (`/parametry` oraz `/analiza`)
- **Wybór aktywnych parametrów**: swobodne włączanie i wyłączanie wskaźników uwzględnianych w badaniu.
- **Gotowe profile gabinetowe (presety)**:
  - *Pełny panel kliniczny (8 parametrów)*
  - *Panel łojotokowo-porowy*
  - *Panel bariery i naczyń*
  - *Panel anti-aging i przebudowy*
- **Wagi diagnostyczne**: możliwość nadania każdemu parametrowi priorytetu wagowego (`0.5×`, `1.0×`, `1.5×`, `2.0×`).
- **Dodawanie własnych parametrów**: tworzenie niestandardowych wskaźników (np. *pH powierzchni skóry*, *złuszczanie naskórka*, *wrażliwość UV*) z własnym zakresem normy, kierunkiem interpretacji skali, powiązanym fenotypem MSC i rekomendowanymi substancjami aktywnymi.

### 3. Silnik analizy wyświetlanych i badanych parametrów skóry
- **Indeks Równowagi Skóry (`0–100 pkt`)**: ważony wskaźnik homeostazy wyliczany na żywo na podstawie zgodności badanych parametrów z normami klinicznymi.
- **Wieloosiowy wykres radarowy SVG**: wizualne zestawienie wyników pacjenta z fizjologiczną strefą referencyjną.
- **Analiza korelacji i synergii międzyparametrowych**: automatyczne wykrywanie złożonych stanów klinicznych (np. *łojotok z odwodnieniem naskórka*, *sprzężenie naczyniowo-barierowe*, *okno regeneracji pozabiegowej*, *ryzyko przebarwień pozapalnych PIH*).
- **Filtrowanie i symulacja na żywo w raporcie (`/wyniki/:id`)**: filtrowanie wyświetlanych parametrów (*Wszystkie*, *Poza normą*, *W normie*) oraz interaktywna korekta parametrów z natychmiastowym przeliczeniem kodu MSC i zaleceń pielęgnacyjnych.

### 4. Pulpit obsługi aparatu fotograficznego i skaner 3D LiDAR (`/skaner`)
- **Sterowanie parametrami ekspozycji i optyki**: płynna regulacja kompensacji ekspozycji (`EV -2.0..+2.0`), czułości `ISO (100–3200)`, czasu otwarcia migawki (`1/30 s – 1/1000 s`), zoomu (`1.0×–4.0×`), trybu ostrości (`AF-C / MF` z dystansem roboczym w cm), mikrokontrastu dermatoskopowego oraz podglądu **Focus Peaking** (wraz z synchronizacją sprzętową `MediaStreamTrack` na wspieranych kamerach mobilnych).
- **Kalibracja balansu bieli (WB)**: ręczny dobór temperatury barwowej (`2800K–8500K`) i tinty (`G/M`), presety oświetlenia gabinetowego, automatyczna kalibracja na wzorcu **18% szarej karty** oraz interaktywna **pipeta punktowa WB** na wizjerze oparta na adaptacji chromatycznej von Kriesa z raportowaniem odchylenia barwnego $\Delta E$.
- **Wbudowany czujnik prawidłowego światła**: analiza fotometryczna w czasie rzeczywistym — estymacja natężenia oświetlenia (`lx`), średnia luminancja (`IRE %`), detekcja przepaleń odblaskowych warstwy rogowej, niedoświetlenia cieni, symetrii czterokwadrantowej oświetlenia oraz 24-pasmowy histogram luminancji.
- **Wbudowany czujnik prawidłowej ostrości**: ocena mikroostrości porów i linii papilarnych w centralnym obszarze ROI za pomocą gęstości krawędzi operatora Sobela oraz wariancji laplasjanu ($\Delta^2$) ze znormalizowanym wskaźnikiem ostrości `0–100 pkt`.
- **Tworzenie modeli 3D z jednoczesnego zapisu filmu i skanera LiDAR**: równoczesna rejestracja strumienia wideo (`MediaRecorder` `.webm`) i zsynchronizowanych czasowo pakietów głębi ToF LiDAR (`LidarFramePacket[]`), wieloklatkowa fuzja geometrii 3D z kompensacją orientacji urządzenia, interaktywna scena 3D (**Three.js**: *Tekstura RGB*, *Chmura punktów LiDAR*, *Mapa głębi ToF*, *Siatka 3D*), wyliczanie mikroszorstkości $R_a\;(\mu\text{m})$ z transferem do parametrów MSC-MATRIX oraz eksport modeli do plików **`.PLY`** i **`.OBJ`**.

### 5. Wersja na telefon (Mobile-First + Instalowalna aplikacja PWA)
- **Ergonomiczna dolna nawigacja mobilna (`Start`, `Analiza`, `Skaner 3D`, `Parametry`, `Historia`)**: obsługa jedną ręką w strefie kciuka z obsługą bezpiecznych krawędzi ekranu (`safe-area-inset-bottom`).
- **Powiększone strefy dotyku (`≥ 48×48 px`)**: przyciski krokowe `- / +`, suwaki parametrów i karty odpowiedzi zoptymalizowane pod ekrany smartfonów (`375px–430px`).
- **Instalacja na ekranie głównym (iOS / Android) i praca offline**: pełny Web App Manifest, Service Worker (`vite-plugin-pwa`), dedykowane ikony PNG/maskable oraz wbudowany kreator instalacji dla Safari (iPhone/iPad) i przeglądarek Chromium (Android).

### 6. Historia terapii i udostępnianie tokenem (`/historia`, `/historia/:token`)
- Chronologiczna oś czasu badań z analizą zmian stopnia nasilenia oraz Indeksu Równowagi Skóry pomiędzy wizytami.
- Hybrydowa warstwa danych: pełna integracja z **Supabase (PostgreSQL + RLS)** oraz automatyczny tryb lokalny (`localStorage`) działający natychmiast bez konieczności konfiguracji zewnętrznej bazy danych.

---

## System klasyfikacji MSC-MATRIX

### 9 klas fenotypowych skóry

| Kod | Klasa kliniczna | Charakterystyka |
| :--- | :--- | :--- |
| `SEB` | **Łojotokowa** | Nadmiar sebum, rozszerzone ujścia gruczołów łojowych, skłonność do zmian trądzikowych |
| `XER` | **Sucha** | Osłabiona bariera hydrolipidowa, podwyższone TEWL, szorstkość i uczucie ściągania |
| `VAS` | **Naczynkowa** | Teleangiektazje, rumień napadowy lub utrwalony, nadreaktywność na temperaturę i stres |
| `AGE` | **Dojrzała** | Spadek gęstości kolagenu i elastyny, zmarszczki, utrata owalu i fotostarzenie |
| `OIL` | **Tłusta** | Całodobowa nadczynność gruczołów łojowych i wyraźne błyszczenie cery |
| `MIX` | **Mieszana** | Niejednorodna topografia: łojotokowa strefa T oraz suche lub normalne policzki |
| `NOR` | **Normalna** | Fizjologiczna równowaga wodno-lipidowa i wysoka tolerancja na czynniki zewnętrzne |
| `CIC` | **Z bliznami** | Przebarwienia pozapalne (PIH), dyschromie posłoneczne oraz blizny zanikowe/potrądzikowe |
| `REM` | **Przebudowana** | Skóra w fazie aktywnego remodelingu po zabiegach laserowych, iniekcyjnych lub peelingach |

### Stopnie nasilenia zmian

- **`G0` — Równowaga**: stan fizjologiczny bez aktywnych odchyleń klinicznych.
- **`G1` — Powierzchowny**: łagodne, odwracalne odchylenia funkcjonalne naskórka.
- **`G2` — Strukturalny**: wyraźne zmiany wymagające celowanej pielęgnacji aktywnej.
- **`G3` — Utrwalony**: głębokie, przewlekłe odchylenia wymagające planu gabinetowego lub konsultacji dermatologicznej.

### Domyślne badane parametry biofizyczne

| ID parametru | Nazwa parametru | Zakres normy | Główny obszar diagnostyczny |
| :--- | :--- | :--- | :--- |
| `sebum` | Wydzielanie sebum | `25–45%` | Gospodarka lipidowa (`OIL`, `SEB`, `MIX`) |
| `hydration` | Nawilżenie warstwy rogowej | `55–85%` | Bilans wodny / korneometria (`XER`, `MIX`) |
| `barrier` | Szczelność bariery (TEWL) | `65–95 pkt` | Cement międzykomórkowy (`XER`, `VAS`, `REM`) |
| `vascular` | Reaktywność naczyniowa i rumień | `0–25%` | Mikrokrążenie powierzchowne (`VAS`) |
| `elasticity` | Elastyczność i gęstość skóry | `65–95%` | Biomechanika kolagenu (`AGE`) |
| `pores_texture` | Tekstura i widoczność porów | `0–30%` | Keratynizacja i ujścia gruczołów (`SEB`, `MIX`, `CIC`) |
| `pigmentation_scars` | Przebarwienia i blizny (PIH) | `0–20%` | Melanogeneza i struktura (`CIC`, `AGE`) |
| `remodeling` | Indeks przebudowy pozabiegowej | `0–20%` | Regeneracja pozabiegowa (`REM`) |

---

## Stos technologiczny

- **Frontend**: React 18, TypeScript 5, React Router 6
- **Grafika 3D i przetwarzanie optyczne**: Three.js (WebGL, fuzja chmury punktów i siatek 3D LiDAR, eksport `.PLY` / `.OBJ`), Canvas 2D API, MediaDevices / MediaRecorder API
- **Budowanie i PWA**: Vite 5, `vite-plugin-pwa` (Workbox, Web App Manifest, obsługa offline)
- **Stylizacja i UI**: Tailwind CSS 3, Lucide React, responsywne wykresy wektorowe SVG
- **Baza danych**: Supabase (`@supabase/supabase-js`, PostgreSQL z Row Level Security) + wbudowany trwały fallback lokalny (`localStorage`)

---

## Struktura projektu

```text
├── public/
│   ├── favicon.svg                  # Wektorowy sygnet aplikacji
│   ├── apple-touch-icon.png         # Ikona ekranu głównego iOS (180x180)
│   ├── pwa-192x192.png              # Ikona aplikacji PWA (192x192)
│   ├── pwa-512x512.png              # Ikona aplikacji PWA (512x512)
│   └── pwa-maskable-512x512.png     # Ikona maskowalna Android PWA (512x512)
├── src/
│   ├── components/
│   │   ├── Footer.tsx               # Stopka nawigacyjna z przyciskiem instalacji PWA
│   │   ├── Header.tsx               # Responsywny pasek górny
│   │   ├── LidarModelViewer3D.tsx   # Interaktywny wizualizator 3D (Three.js) siatki i chmury LiDAR
│   │   ├── MobileBottomNav.tsx      # Dolny pasek nawigacji dla wersji na telefon
│   │   ├── MSCCodeBadge.tsx         # Prezentacja wyliczonego kodu MSC-MATRIX
│   │   ├── ParameterRadarChart.tsx  # Wieloosiowy wykres radarowy SVG parametrów skóry
│   │   ├── PhenotypeCard.tsx        # Karta wyniku punktowego klasy fenotypowej
│   │   ├── PWAInstallButton.tsx     # Instalator aplikacji mobilnej i wskaźnik offline
│   │   └── SkinParameterAnalyzerPanel.tsx # Moduł analizy i edycji badanych parametrów
│   ├── hooks/
│   │   └── usePWAInstall.ts         # Obsługa instalacji PWA oraz stanu połączenia
│   ├── lib/
│   │   ├── cameraOptics.ts          # Przetwarzanie obrazu, kalibracja WB, czujniki światła i ostrości
│   │   ├── lidarReconstruction.ts   # Synchronizacja wideo+LiDAR, fuzja 3D oraz eksport PLY/OBJ
│   │   ├── mscMatrix.ts             # Algorytm kwestionariusza i zaleceń MSC-MATRIX
│   │   ├── skinParameters.ts        # Silnik parametrów skóry, presetów i korelacji
│   │   └── supabase.ts              # Klient Supabase z automatycznym trybem lokalnym
│   ├── pages/
│   │   ├── AnalysisPage.tsx         # Kwestionariusz 10 pytań z wyborem parametrów
│   │   ├── CameraLidarPage.tsx      # Pulpit aparatu fotograficznego, czujników i rekonstrukcji 3D LiDAR
│   │   ├── HistoryPage.tsx          # Oś czasu badań i wyszukiwarka tokenów
│   │   ├── LandingPage.tsx          # Strona główna prezentująca system MSC-MATRIX
│   │   ├── NotFoundPage.tsx         # Widok 404
│   │   ├── ParametersPage.tsx       # Interaktywne Laboratorium Parametrów Skóry
│   │   └── ResultsPage.tsx          # Pełny raport kodu, parametrów i symulacji korekty
│   ├── types/
│   │   ├── database.ts              # Typy schematu bazy danych
│   │   └── index.ts                 # Modele domenowe MSC-MATRIX i parametrów
│   ├── App.tsx                      # Konfiguracja routingu i powłoki mobilnej
│   └── main.tsx                     # Punkt wejścia i rejestracja Service Workera
└── supabase/
    └── migrations/                  # Skrypty SQL tworzące tabelę `analyses` oraz polityki RLS
```

---

## Uruchomienie lokalne

### Wymagania
- **Node.js** w wersji `>= 18` (zalecane Node.js 20 lub 22)
- **npm**

### Instalacja krok po kroku

1. Sklonuj repozytorium i zainstaluj zależności:
   ```bash
   git clone <adres-repozytorium>
   cd myskincode
   npm install
   ```

2. *(Opcjonalnie)* Skonfiguruj połączenie z bazą **Supabase**:
   - Skopiuj plik `.env.example` do `.env`:
     ```bash
     cp .env.example .env
     ```
   - Uzupełnij zmienne `VITE_SUPABASE_URL` oraz `VITE_SUPABASE_ANON_KEY`, a w edytorze SQL Supabase wykonaj migrację z katalogu `supabase/migrations/`.
   - **Uwaga**: Jeśli zmienne środowiskowe pozostaną puste, aplikacja automatycznie uruchomi wbudowany magazyn lokalny przeglądarki (`localStorage`), zachowując pełną funkcjonalność zapisu wyników oraz historii analiz.

3. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```
   Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

4. Budowanie wersji produkcyjnej i kontrola typów:
   ```bash
   npm run lint
   npm run build
   ```

---

## Instalacja wersji na telefon (PWA)

Aplikację można zainstalować bezpośrednio z poziomu przeglądarki mobilnej bez sklepu z aplikacjami:
- **Android (Chrome / Edge / Samsung Internet)**: otwórz aplikację w przeglądarce i kliknij przycisk **„Zainstaluj aplikację”** na ekranie startowym lub wybierz *Dodaj do ekranu głównego* w menu przeglądarki.
- **iPhone / iPad (Safari)**: otwórz aplikację w Safari, stuknij ikonę **Udostępnij**, a następnie wybierz **„Dodaj do ekranu początkowego”**.

---

## Zastrzeżenie medyczne

Wyniki generowane przez aplikację **MySkinCode** mają charakter informacyjny, edukacyjny oraz wspomagający dobór pielęgnacji kosmetycznej. Nie stanowią diagnozy lekarskiej ani nie zastępują konsultacji z lekarzem dermatologiem.