# ⚽ Quiniela Mundial FIFA 2026

Aplicación web completa para gestionar una quiniela del Mundial FIFA 2026. Construida con Node.js, Express y PostgreSQL.

---

## 🚀 Despliegue en Render.com (paso a paso)

### 1. Preparar el repositorio en GitHub

```bash
# En tu computadora, dentro de la carpeta del proyecto:
git init
git add .
git commit -m "feat: Quiniela Mundial 2026 - versión inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/quiniela-mundial-2026.git
git push -u origin main
```

### 2. Crear cuenta en Render.com

Ve a [render.com](https://render.com) y regístrate con tu cuenta de GitHub.

### 3. Crear la base de datos PostgreSQL

1. En el dashboard de Render → **New** → **PostgreSQL**
2. Nombre: `quiniela-db`
3. Plan: **Free**
4. Click en **Create Database**
5. Copia el **Internal Database URL** (lo necesitarás después)

### 4. Crear el Web Service

1. En el dashboard de Render → **New** → **Web Service**
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Name**: `quiniela-mundial-2026`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 5. Configurar Variables de Entorno

En el Web Service → **Environment** → agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (Internal URL de tu BD en Render) |
| `JWT_SECRET` | (genera una clave segura aleatoria, mín. 32 chars) |
| `SESSION_SECRET` | (genera otra clave aleatoria) |
| `NODE_ENV` | `production` |

### 6. Deploy

Click en **Create Web Service** → Render construirá y desplegará automáticamente.

La base de datos se inicializa sola en el primer arranque (tablas, equipos y partidos del Mundial 2026 se cargan automáticamente).

---

## 👑 Crear el primer administrador

Una vez desplegado, tienes dos opciones:

### Opción A: Desde la app (recomendado)
1. Primero regístrate como usuario normal usando cualquier token disponible (ej: `2026`)
2. Luego accede a la BD de Render → **Dashboard** → tu BD → **PSQL Console** y ejecuta:
```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@correo.com';
```

### Opción B: Insertar admin directo en BD
Desde la consola PSQL de Render:
```sql
-- El hash corresponde a la contraseña "Admin2026!" 
-- Cambia el hash generando uno nuevo con bcrypt
INSERT INTO users (nombre, apellido, email, password_hash, role)
VALUES ('Admin', 'Sistema', 'admin@tudominio.com', 
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmiIOmFgGFgIIeFcHIIeJXAZKu', 
  'admin');

INSERT INTO ranking_cache (user_id, total_points)
SELECT id, 0 FROM users WHERE email = 'admin@tudominio.com';
```

---

## 🏠 Desarrollo Local

### Requisitos
- Node.js 18+
- PostgreSQL 14+

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Crear base de datos local
createdb quiniela_mundial

# 3. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales locales

# 4. Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en: `http://localhost:3000`

---

## 🎮 Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🔐 Registro con token | Solo usuarios autorizados con token de 4 chars |
| ⚽ Predicciones | Marca el resultado y/o marcador exacto |
| 🔒 Bloqueo automático | Se cierra 5 minutos antes del partido |
| 🏆 Ranking en tiempo real | Tabla actualizada con puntos, resultados y exactos |
| ⚙️ Panel admin | Actualiza resultados, gestiona tokens y usuarios |
| 📱 Responsive | Funciona en móvil y escritorio |

## 📊 Sistema de puntuación

- ✅ **1 punto** por acertar el resultado (local gana / empate / visita gana)
- ⭐ **+1 punto extra** por adivinar el marcador exacto
- 🔒 Predicciones bloqueadas **5 minutos antes** de cada partido

## 🎫 Tokens de registro disponibles por defecto

```
1926  2026  FIFA1  GOL1  MX26  USA1  CAN1  4321
9876  1234  5678  PASS  2626  WORLD  CUP26  FTBL
3333  7777  8888  GOAL  WIN2  FANS  CLUB  JOIN
```

Puedes agregar más desde el **Panel de Administración**.

---

## 🗂 Estructura del Proyecto

```
quiniela-mundial-2026/
├── backend/
│   ├── config/
│   │   ├── db.js           # Configuración PostgreSQL
│   │   └── init.sql        # Esquema BD + equipos + partidos
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # Login / registro / logout
│   │   ├── matches.js      # Partidos
│   │   ├── predictions.js  # Predicciones
│   │   └── ranking.js      # Ranking + admin
│   └── server.js           # Entry point
├── frontend/
│   └── public/
│       ├── css/styles.css  # Estilos modernos
│       ├── js/app.js       # Lógica frontend
│       └── index.html      # SPA principal
├── .env.example
├── .gitignore
├── package.json
├── render.yaml             # Config automática Render
└── README.md
```

---

## 🛠 Tecnologías

- **Backend**: Node.js, Express, JWT, bcrypt, PostgreSQL (pg)
- **Frontend**: HTML5, CSS3 (Variables, Grid, Flexbox), Vanilla JS
- **DB**: PostgreSQL con funciones PL/pgSQL para cálculo automático de puntos
- **Deploy**: Render.com (Free tier compatible)

---

## ⚠️ Notas importantes para Render Free

- El servicio **se duerme** después de 15 minutos de inactividad
- El primer request tras inactividad puede tardar ~30 segundos
- La base de datos free tiene límite de **1GB** de almacenamiento
- Para uso continuo, considera el plan Starter ($7/mes)

---

Desarrollado con ❤️ para el **FIFA World Cup 2026** 🇺🇸🇲🇽🇨🇦
