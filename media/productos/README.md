# Product images (option A — folder by code)

Put one image per product using the **exact product code** as the file name:

```text
1200AP100.jpg
LM358.jpg
ESP32-WROOM.jpg
```

Rules:

- Extension: **`.jpg`** (preferred). Also accepted by the static server if you use `.jpeg`, `.png`, or `.webp` with the same base name — the storefront looks for `.jpg` first.
- Folder on the API host (Dokploy volume): mount this directory at `/app/media/productos` inside the `electronica-api` container.
- Public URL: `http://<api-host>/media/productos/<codigo>.jpg`
- If the file is missing, the UI shows the category silhouette.

Do not commit hundreds of binary images to git; keep them on the server volume.
