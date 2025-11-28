import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), '..', 'proyecto-completo.zip');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const stat = fs.statSync(filePath);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename=proyecto-completo.zip');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({ error: 'Error al descargar' });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
