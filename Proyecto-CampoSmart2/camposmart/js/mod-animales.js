// --- MÓDULO 1: LÓGICA OPERATIVA DE ANIMALES (MOD-ANIMALES.JS) ---

// 1. CONTROLADOR DE REGISTRO / EDICIÓN TRANSACCIONAL SEGURO
document.getElementById("form-animal").addEventListener("submit", function(e) {
    e.preventDefault();
    
    // Captura defensiva de datos limpiando espacios
    const caravana = document.getElementById("caravana").value.trim().toUpperCase();
    const editId = document.getElementById("edit-id").value;
    const archivoImagen = document.getElementById("foto-archivo").files[0];

    // Estructuración del Payload con tipado correcto
    const payloadAnimal = {
        caravana: caravana,
        categoria: document.getElementById("categoria-select").value,
        peso: parseFloat(document.getElementById("peso").value) || 0,
        madre: document.getElementById("madre").value.trim().toUpperCase(),
        padre: document.getElementById("padre").value.trim().toUpperCase(),
        nacimiento: document.getElementById("f-nacimiento").value,
        paricion: document.getElementById("f-paricion").value,
        observaciones: document.getElementById("observaciones").value.trim(),
        fechaRegistro: new Date().toISOString()
    };

    // Procesamiento de imagen Offline-First (Conversión a Base64)
    if (archivoImagen) {
        const lector64 = new FileReader();
        lector64.onload = function(evt) {
            payloadAnimal.foto = evt.target.result; // Almacena el binario como texto en la base de datos
            despacharPersistenciaAnimal(payloadAnimal, editId);
        };
        lector64.readAsDataURL(archivoImagen);
    } else {
        // Si estamos editando y no se subió una foto nueva, conservamos la que ya tenía
        if (editId) {
            const txBusqueda = dbInstancia.transaction("animales", "readonly");
            txBusqueda.objectStore("animales").get(editId).onsuccess = (ev) => {
                payloadAnimal.foto = ev.target.result ? ev.target.result.foto : null;
                despacharPersistenciaAnimal(payloadAnimal, editId);
            };
        } else {
            payloadAnimal.foto = null;
            despacharPersistenciaAnimal(payloadAnimal, editId);
        }
    }
});

// 2. DESPACHADOR ATÓMICO EN BASE DE DATOS
function despacharPersistenciaAnimal(datos, editId) {
    const tx = dbInstancia.transaction("animales", "readwrite");
    const store = tx.objectStore("animales");

    if (!editId) {
        // MODO ALTA: Verifica estrictamente si la clave primaria (Caravana) ya existe
        const peticionChequeo = store.get(datos.caravana);
        peticionChequeo.onsuccess = () => {
            if (peticionChequeo.result) {
                emitirNotificacionToast(`¡Bloqueado! La caravana ${datos.caravana} ya existe. Evita duplicados.`, "error");
            } else {
                store.put(datos).onsuccess = () => resolucionExitosaFormulario("Animal ingresado con éxito.");
            }
        };
    } else {
        // MODO EDICIÓN BLINDADA: Si cambió la caravana, borra el ID anterior e inserta el nuevo
        if (editId !== datos.caravana) {
            store.delete(editId);
        }
        store.put(datos).onsuccess = () => resolucionExitosaFormulario("Registro actualizado de forma segura.");
    }
}

// 3. RESPUESTA VISUAL Y RESETEO
function resolucionExitosaFormulario(msj) {
    emitirNotificacionToast(msj, "exito");
    abortarFlujoEdicionAnimal();
    if (typeof ejecutarCalculosDashboardStock === "function") ejecutarCalculosDashboardStock();
    if (typeof filtrarYMostrarAnimalesConHistorial === "function") filtrarYMostrarAnimalesConHistorial();
}

function abortarFlujoEdicionAnimal() {
    document.getElementById("form-animal").reset();
    document.getElementById("edit-id").value = "";
    document.getElementById("caravana").disabled = false;
    document.getElementById("btn-guardar-animal").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Ficha';
}

// 4. EXPORTACIÓN LIMPIA A EXCEL (PURGA DEFENSIVA DE BASE64)
function exportarLimpiamenteAExcel() {
    const tx = dbInstancia.transaction("animales", "readonly");
    const dataLimpiaDestino = [];

    tx.objectStore("animales").openCursor().onsuccess = function(evt) {
        const cursor = evt.target.result;
        if (cursor) {
            // Desestructuración avanzada: extraemos 'foto' y la desechamos para el reporte Excel
            const { foto, ...restoCampos } = cursor.value;
            dataLimpiaDestino.push(restoCampos);
            cursor.continue();
        } else {
            if (dataLimpiaDestino.length === 0) {
                emitirNotificacionToast("No se detectaron registros para exportar.", "error");
                return;
            }
            
            // Creación nativa del archivo Excel utilizando xlsx.js del lado del cliente
            const estructuraHoja = XLSX.utils.json_to_sheet(dataLimpiaDestino);
            const estructuraLibro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(estructuraLibro, estructuraHoja, "Establecimiento Nelson");
            
            // Generación de descarga inmediata en PC o celular
            XLSX.writeFile(estructuraLibro, `CampoSmart_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`);
            emitirNotificacionToast("Reporte Excel descargado correctamente.", "exito");
        }
    };
}

// 5. UTILIDAD REUTILIZABLE: COMPONENTE INTERNO TOAST PARA EL CAMPO
function emitirNotificacionToast(texto, tipo) {
    const toast = document.getElementById("global-toast");
    toast.innerText = texto;
    toast.style.backgroundColor = tipo === "error" ? "var(--rojo-operativo)" : "var(--verde-institucional)";
    toast.style.color = "white";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
}
