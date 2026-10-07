# StyleGT

Plataforma de comercio electronico orientada a moda contemporanea y prendas minimalistas. La aplicacion cuenta con una interfaz fluida, gestion de catalogo en tiempo real, seleccion dinamica de variantes, carrito de compras persistente y sistema de checkout integrado con base de datos en la nube.

---

## Tabla de Contenidos

- [Descripcion General](#descripcion-general)
- [Caracteristicas Principales](#caracteristicas-principales)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalacion y Uso Local](#instalacion-y-uso-local)
- [Integracion con Base de Datos](#integracion-con-base-de-datos)
- [Despliegue](#despliegue)
- [Autor](#autor)

---

## Descripcion General

StyleGT es una aplicacion web monolitica ligera enfocada en el rendimiento, la accesibilidad y una experiencia de usuario limpia. No depende de frameworks pesados en el cliente, logrando tiempos de carga instantaneos y una manipulacion eficiente del DOM mediante JavaScript nativo.

El diseno sigue principios de estetica editorial y minimalista, optimizado para ofrecer una navegacion comoda tanto en dispositivos moviles como en computadoras de escritorio.

---

## Caracteristicas Principales

### Catalogo y Busqueda
- Renderizado dinamico de productos desde la base de datos.
- Filtrado por categorias en tiempo real sin recargar la pagina.
- Busqueda predictiva por nombre o descripcion de producto.
- Ordenamiento de articulos por precio y popularidad.

### Detalle y Variantes de Producto
- Vista modal detallada con galeria y especificaciones.
- Selector interactivo de combinaciones de color y talla.
- Comprobacion automatica de inventario disponible por variante.
- Control de cantidad sujeto a disponibilidad en stock.

### Carrito de Compras
- Panel lateral deslizante accesible desde cualquier seccion.
- Persistencia local del estado mediante LocalStorage para evitar perdida de seleccion tras cerrar el navegador.
- Calculo automatico y en tiempo real de subtotales, envios e importes finales.
- Actualizacion y eliminacion individual de articulos.

### Flujo de Checkout
- Formulario de finalizacion de compra con validacion de campos requeridos (nombre, telefono, direccion).
- Confirmacion visual y generacion de recibo con identificador unico de orden.
- Registro transaccional del pedido en el backend.

### Experiencia de Usuario
- Diseno completamente responsivo (Mobile First).
- Sistema de notificaciones flotantes (Toasts) para retroalimentacion de acciones.

---

## Tecnologias Utilizadas

- **HTML5:** Estructura semantica accesible y optimizada para SEO.
- **CSS3:** Sistema de diseno personalizado basado en variables CSS (Custom Properties), Flexbox y CSS Grid.
- **JavaScript (ES6+):** Logica de negocio, control de estado local y consumo de APIs de forma asincrona.
- **Supabase JS Client (v2):** Backend as a Service (BaaS) basado en PostgreSQL para lectura del catalogo y persistencia de ordenes.
- **Lucide Icons:** Conjunto de iconos vectoriales consistentes y ligeros.
- **Google Fonts:** Tipografia Plus Jakarta Sans para legibilidad editorial.

---

## Estructura del Proyecto

```text
StyleGT/
├── index.html        # Estructura principal y componentes modales
├── style.css         # Sistema de diseno, tipografia y reglas responsivas
├── app.js            # Logica de aplicacion, eventos y conexion con Supabase
├── logo.jpg          # Logotipo principal de la marca
├── logo-icon.png     # Icono de marca y favicon
├── .gitignore        # Exclusion de archivos de entorno y temporales
└── README.md         # Documentacion tecnica del repositorio
```

---

## Instalacion y Uso Local

Para ejecutar el proyecto en un entorno local, sigue estos pasos:

### 1. Clonar el repositorio

```bash
git clone https://github.com/pabloloaisiga85-cyber/StyleGT.git
cd StyleGT
```

### 2. Ejecutar un servidor local

Dado que la aplicacion consume recursos externos y modulos web, se recomienda ejecutarla a traves de un servidor HTTP local en lugar de abrir el archivo directamente en el explorador.

Puedes utilizar cualquiera de las siguientes alternativas:

**Opcion A - Python:**
```bash
python -m http.server 8000
```
Luego abre tu navegador en `http://localhost:8000`.

**Opcion B - Node.js (npx serve):**
```bash
npx serve .
```

**Opcion C - Extension de editor:**
Si utilizas VS Code, puedes hacer clic derecho sobre `index.html` y seleccionar **Open with Live Server**.

---

## Integracion con Base de Datos

El proyecto se comunica directamente con una instancia de Supabase. El esquema de datos soporta:

- **products:** Catalogo base de articulos (titulo, descripcion, categoria, imagen principal).
- **variants:** Variaciones de cada producto con su stock y combinacion de talla/color.
- **categories:** Segmentacion y categorizacion de la coleccion.
- **orders:** Almacenamiento de pedidos realizados con el detalle de cliente y productos solicitados.

Las consultas se ejecutan con politicas de acceso de solo lectura publica para el catalogo (Row Level Security - RLS) y permisos de insercion controlados para la generacion de ordenes.

---

## Despliegue

La aplicacion esta disenada como una solucion estatica, lo que permite desplegarla de forma inmediata en cualquier plataforma de alojamiento de sitios estaticos:

- **GitHub Pages:** Activando la publicacion desde la rama `main` en la configuracion del repositorio.
- **Vercel / Netlify:** Conectando el repositorio de GitHub para compilaciones y despliegues automaticos en cada commit.

---

## Autor

Desarrollado por **Pablo Loaisiga**.
Repositorio: [https://github.com/pabloloaisiga85-cyber/StyleGT](https://github.com/pabloloaisiga85-cyber/StyleGT)
