export const TEXT_PATTERN_PRESETS = [
  { value: "none", label: "Sin regla adicional", pattern: "", message: "" },
  { value: "letters", label: "Solo letras", pattern: "^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$", message: "usa solo letras" },
  { value: "letters-spaces", label: "Letras y espacios", pattern: "^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$", message: "usa solo letras y espacios" },
  { value: "digits", label: "Solo dígitos", pattern: "^\\d+$", message: "usa solo dígitos" },
  { value: "alphanumeric", label: "Letras y números", pattern: "^[A-Za-z0-9]+$", message: "usa solo letras y números" },
  { value: "uppercase", label: "Solo mayúsculas", pattern: "^[A-Z]+$", message: "usa solo letras mayúsculas" },
  { value: "lowercase", label: "Solo minúsculas", pattern: "^[a-z]+$", message: "usa solo letras minúsculas" },
  { value: "custom", label: "Escribir una regla avanzada" },
]
