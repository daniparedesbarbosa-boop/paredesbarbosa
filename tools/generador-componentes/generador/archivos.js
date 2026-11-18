import { copyFile, lstat, mkdir, readdir, rename, rm } from "node:fs/promises"
import path from "node:path"

const TRANSIENT_CODES = ["EPERM", "EBUSY", "EACCES"]

// En Windows, mover una carpeta recién escrita puede fallar con EPERM o EBUSY:
// un antivirus o un indexador la está revisando. Se reintenta unas pocas veces
// con una espera creciente antes de devolver el error real.
export async function renameWithRetry(from, to, { attempts = 5, delayMs = 120 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      lastError = error
      if (!TRANSIENT_CODES.includes(error.code) || attempt === attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
  throw lastError
}

async function copyDirectoryContents(from, to) {
  await mkdir(to, { recursive: true })
  const entries = await readdir(from, { withFileTypes: true })
  for (const entry of entries) {
    const source = path.join(from, entry.name)
    const destination = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await copyDirectoryContents(source, destination)
    } else {
      await copyFile(source, destination)
    }
  }
}

// Publica el contenido generado en su carpeta final. Lo normal es renombrar la
// carpeta temporal (operación atómica), pero algunos sistemas de archivos de
// Windows rechazan mover carpetas con subcarpetas; en ese caso se copia el
// contenido y se descarta la temporal para no dejar la generación a medias.
export async function publishGeneratedDirectory(temporaryDirectory, targetDirectory) {
  try {
    await renameWithRetry(temporaryDirectory, targetDirectory)
    return
  } catch (error) {
    if (!TRANSIENT_CODES.includes(error.code)) throw error
  }

  const targetExisted = await pathExists(targetDirectory)
  try {
    await copyDirectoryContents(temporaryDirectory, targetDirectory)
  } catch (error) {
    if (!targetExisted) await rm(targetDirectory, { recursive: true, force: true })
    throw error
  }
  await rm(temporaryDirectory, { recursive: true, force: true })
}

async function pathExists(target) {
  try {
    await lstat(target)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    return true
  }
}
