import express from "express";
import fs from "fs";
import cors from "cors";
import "dotenv/config";
import { MongoClient } from "mongodb";

//Crear la aplicacion express
const app = express();
app.use(cors());

//Usa el puerto definido en el archivo .env o el puerto 3000 si no se define
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;

//Creamos el cliente MongoDB o la cadena de conexión
const client = new MongoClient(MONGO_URI);

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
async function iniciarServer() {
  try {
    //Conectamos con mongoDB
    await client.connect();
    console.log("Conexión exitosa a MongoDB");
    app.listen(PORT, () => {
      console.log("Servidor funcionando en http://localhost:${PORT}");
    });
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
  }
  
}

iniciarServer();
