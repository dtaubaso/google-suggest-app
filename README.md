# 🔍 Google Suggest Keyword Harvester (Buscador de Sugerencias de Google)

---

## 🚀 Descripción General del Proyecto

Esta es una aplicación web full-stack, diseñada para **extraer sugerencias de autocompletado** (Google Suggest/Autocomplete) de Google. Simula las búsquedas basadas en palabras clave, preguntas comunes, y caracteres alfabéticos/numéricos, tal como lo haría el script original de Google Apps Script, pero optimizado para ser un servicio *serverless* y desplegable en Vercel.

La herramienta es ideal para investigadores de palabras clave, especialistas en SEO (Search Engine Optimization) y *content marketers* que necesitan obtener listas extensas de ideas de contenido basadas en la intención de búsqueda real del usuario en diferentes países e idiomas.

### Características Principales

* **Búsqueda exhaustiva:** Utiliza el método de "pregunta + palabra clave" y "letra + palabra clave" para maximizar la recolección de sugerencias.
* **Segmentación Geográfica:** Permite seleccionar el país de origen de la búsqueda (`gl`), incluyendo la mayoría de países de Latinoamérica y España.
* **Segmentación Lingüística:** Permite seleccionar el idioma de las sugerencias (`hl`), incluyendo español (`es`), español latinoamericano (`es-419`), inglés (`en`) y portugués (`pr`).
* **Exportación a CSV:** Permite la descarga de los resultados en un archivo CSV con codificación UTF-8, garantizando que los caracteres especiales (acentos, ñ) se muestren correctamente en Excel/Sheets.

---

## ⚙️ Tecnologías Utilizadas

Este proyecto fue construido utilizando la arquitectura moderna de desarrollo web:

* **Frontend:** [React.js](https://reactjs.org/) (incluido en Next.js) para la interfaz de usuario.
* **Backend / Serverless:** [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) (Node.js) para manejar la lógica de *scraping* de la API de Google y evitar problemas de CORS.
* **Despliegue:** Optimizado para [Vercel](https://vercel.com/).
* **Librerías Clave:**
    * `node-fetch`: Para realizar peticiones HTTP en el *backend*.
    * `xml2js`: Para parsear la respuesta XML que devuelve el *endpoint* de sugerencias de Google.

---

## 🔧 Instalación y Ejecución Local

Sigue estos pasos para configurar y ejecutar la aplicación en tu máquina local.

### Requisitos

Necesitas tener instalado [Node.js](https://nodejs.org/) (versión 18+) y npm.

### Pasos

1.  **Clonar el Repositorio** (asumiendo que ya tienes tu código en un repositorio git):

    ```bash
    git clone [URL_DE_TU_REPOSITORIO]
    cd google-suggest-app
    ```

2.  **Instalar Dependencias:**

    ```bash
    npm install
    # o si usas yarn:
    # yarn install
    ```

3.  **Ejecutar el Servidor de Desarrollo:**

    ```bash
    npm run dev
    # o si usas yarn:
    # yarn dev
    ```

4.  **Acceder a la Aplicación:**

    Abre tu navegador y navega a: `http://localhost:3000`

---

## 🗺️ Despliegue en Vercel

Dado que esta aplicación utiliza **Next.js**, el despliegue en Vercel es directo y muy simple.

1.  **Crea una Cuenta Vercel:** Si no tienes una, regístrate en [Vercel](https://vercel.com/).
2.  **Conecta tu Repositorio:** Importa tu proyecto (GitHub, GitLab o Bitbucket) a Vercel.
3.  **Configuración Automática:** Vercel detectará automáticamente que se trata de un proyecto Next.js y configurará las API Routes como funciones *serverless*.
4.  **Despliegue:** Haz clic en **Deploy**. La aplicación estará disponible en una URL pública en minutos.

---

## ⚠️ Nota Importante sobre Google Suggest

La API utilizada (`http://suggestqueries.google.com/...`) no es una API oficial y puede cambiar o ser deshabilitada por Google en cualquier momento. Su uso intensivo podría resultar en bloqueos temporales de IP.

---


