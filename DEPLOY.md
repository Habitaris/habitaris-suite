# DEPLOY HABITARIS SUITE

## Lo que ya está listo (no hay que tocar nada)

- ✅ App React completa con todos los módulos
- ✅ PWA configurada (manifest.json, service worker, iconos)
- ✅ Storage funciona en cualquier navegador (localStorage)
- ✅ Portal cliente funciona sin backend
- ✅ Rutas SPA configuradas (vercel.json)
- ✅ Build de producción optimizado (vite.config.js)

---

## Paso 1: Instalar y compilar

```bash
cd habitaris
npm install
npm run build
```

Esto genera la carpeta `dist/` con todo listo.

---

## Paso 2: Subir a Vercel

### Opción A: Desde el terminal

```bash
npx vercel
```

Seguir las instrucciones. Seleccionar:
- Framework: **Vite**
- Output directory: **dist**

### Opción B: Desde vercel.com

1. Ir a vercel.com → New Project
2. Importar el repositorio de GitHub
3. Framework Preset: **Vite**
4. Deploy

---

## Paso 3: Configurar el subdominio CNAME

En el panel DNS del dominio `habitaris.com`:

```
Tipo:   CNAME
Nombre: suite
Valor:  cname.vercel-dns.com
TTL:    300
```

En Vercel → Settings → Domains → Agregar `suite.habitaris.com`

**Resultado:** La app queda en `suite.habitaris.com` con HTTPS automático.

---

## PWA (app instalable)

Ya funciona. Cuando el usuario entre desde Chrome en celular/PC:
- Aparece el botón "Instalar" en la barra del navegador
- En celular Android: bandera "Agregar a pantalla de inicio"
- En iPhone: Safari → Compartir → "Agregar a pantalla de inicio"

La app se abre sin barra del navegador, como app nativa.

---

## ¿Dónde se guardan los datos?

**Ahora:** En `localStorage` del navegador de cada dispositivo.  
**Esto significa:** Los datos son por navegador. Si abro en otro computador, no se ven los datos del primero.

**Futuro (cuando se necesite multi-dispositivo):** Reemplazar el archivo `src/storage-polyfill.js` por una conexión a Supabase. El resto de la app NO cambia.

---

## Estructura de archivos relevantes

```
habitaris/
├── public/
│   ├── manifest.json    ← Configuración PWA
│   ├── sw.js           ← Service Worker (cache offline)
│   ├── icon-192.png    ← Icono PWA (reemplazar con logo Habitaris)
│   └── icon-512.png    ← Icono PWA grande
├── src/
│   ├── storage-polyfill.js  ← Hace que todo funcione en navegador
│   ├── api.js               ← Capa de datos (ofertas, aprobaciones, portal)
│   ├── main.jsx
│   ├── App.jsx
│   └── modules/
│       ├── CRM.jsx
│       ├── RRHH.jsx
│       ├── Herramientas.jsx
│       ├── Logistica.jsx
│       └── PortalCliente.jsx
├── vercel.json         ← Rutas SPA para Vercel
├── vite.config.js      ← Build de producción
└── package.json
```

---

## Cómo funciona el portal del cliente

1. En el CRM → pestaña Entrega → botón "Enviar al cliente"
2. Se genera una URL con los datos de la propuesta codificados
3. Se copia esa URL y se envía por WhatsApp/email
4. El cliente abre el link → ve la propuesta limpia
5. El cliente puede: Aceptar / Solicitar cambios / Rechazar
6. La respuesta se envía automáticamente por WhatsApp a Habitaris

**No necesita servidor ni base de datos.** Los datos van en la URL misma.

---

## Personalización de iconos

Reemplazar estos archivos con el logo de Habitaris:
- `public/icon-192.png` → 192×192 px, PNG, fondo oscuro
- `public/icon-512.png` → 512×512 px, PNG, fondo oscuro

---

## Alternativa a Vercel: Netlify

Si prefieren Netlify en vez de Vercel:

1. Crear archivo `public/_redirects`:
```
/*    /index.html   200
```

2. Subir a Netlify y configurar el dominio igual.
