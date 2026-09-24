// Carga las variables de entorno del .env de la raíz del monorepo (sin agregar
// una dependencia nueva solo para esto) para que los tests de integración
// puedan conectarse a la base de datos local de desarrollo.
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  }
}
