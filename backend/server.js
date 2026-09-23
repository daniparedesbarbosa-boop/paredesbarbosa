import express from "express";
import fs from "fs";
import cors from "cors";

//Crear la aplicacion express
const PORT = 3000;
const app = express();
app.use(cors());

//Ruta de la API para obtener proincias y municipios
app.get('/api/municipios', (req, res) => {
  console.log("Petición recibida");

  // Leer el archivo JSON
  const datos = fs.readFileSync("./backend/data/municipios.json", "utf-8");

  // Convertir el contenido del archivo a un objeto JavaScript
  const datosJSON = JSON.parse(datos);

  // Enviar la respuesta como respuesta al cliente
  res.json(datosJSON);
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Servidor funcionando en http://localhost:${PORT}");
});
