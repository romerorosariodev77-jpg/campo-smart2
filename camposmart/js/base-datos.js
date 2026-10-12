let dbInstancia;
const BASE_DATOS_DATOS = { id: "CampoSmartDB", version: 1 };

function inicializarEstructuraCampoSmart() {
    // Solicita a Android permiso para que la base de datos sea permanente y no se borre sola
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(concedido => {
            if (concedido) console.log("Almacenamiento persistente garantizado por Android.");
        });
    }

    return new Promise((resolver, rechazar) => {
        // Solicitud de apertura de la base de datos local en el navegador
        const peticionConexion = indexedDB.open(BASE_DATOS_DATOS.id, BASE_DATOS_DATOS.version);

        // Se ejecuta solo si la base de datos no existe o cambia de versión
        peticionConexion.onupgradeneeded = (evt) => {
            const db = evt.target.result;
            
            // MÓDULO 1 Y 2: Almacén Principal Blindado con llave primaria por Caravana (Evita duplicados)
            if(!db.objectStoreNames.contains("animales")) {
                db.createObjectStore("animales", { keyPath: "caravana" });
            }
            
            // MÓDULO 2: Almacén para las Categorías parametrizables
            if(!db.objectStoreNames.contains("categorias")) {
                db.createObjectStore("categorias", { keyPath: "id", autoIncrement: true });
            }
            
            // MÓDULO 3: Almacén relacional para tratamientos sanitarios
            if(!db.objectStoreNames.contains("sanidad")) {
                db.createObjectStore("sanidad", { keyPath: "id", autoIncrement: true });
            }
            
            // MÓDULO 4: Almacén relacional para control reproductivo y preñez
            if(!db.objectStoreNames.contains("reproduccion")) {
                db.createObjectStore("reproduccion", { keyPath: "id", autoIncrement: true });
            }
            
            // MÓDULO 5 Y 6: Almacén para movimientos financieros (Compras/Ventas)
            if(!db.objectStoreNames.contains("finanzas")) {
                db.createObjectStore("finanzas", { keyPath: "id", autoIncrement: true });
            }
        };

        // Se ejecuta si la conexión se establece con éxito (Uso Offline disponible)
        peticionConexion.onsuccess = (evt) => {
            dbInstancia = evt.target.result;
            
            // Precarga de datos estructurales y refresco visual del Dashboard
            precargarCategoriasFundacionales().then(() => {
                if (typeof refrescarDesplegablesCategorias === "function") refrescarDesplegablesCategorias();
                if (typeof ejecutarCalculosDashboardStock === "function") ejecutarCalculosDashboardStock();
            });
            resolver(dbInstancia);
        };

        // Captura errores de almacenamiento local
        peticionConexion.onerror = () => {
            if (typeof emitirNotificacionToast === "function") {
                emitirNotificacionToast("Error crítico de almacenamiento físico.", "error");
            }
            rechazar();
        };
    });
}

// Carga las categorías por defecto si el almacén está vacío al iniciar por primera vez
function precargarCategoriasFundacionales() {
    return new Promise((resolver) => {
        const tx = dbInstancia.transaction("categorias", "readwrite");
        const store = tx.objectStore("categorias");
        const req = store.getAll();
        
        req.onsuccess = () => {
            if(req.result.length === 0) {
                const base = ["Vaca", "Vaquillona", "Ternero", "Novillo", "Toro"];
                base.forEach(b => store.add({ nombre: b }));
                tx.oncomplete = () => resolver();
            } else {
                resolver();
            }
        };
    });
}

// CORRECCIÓN: Se añade el parámetro 'e' para capturar el evento de forma segura en Android
function rutearFocoModulo(moduloId, e) {
    document.querySelectorAll('.modulo-contenedor').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
    
    const moduloObjetivo = document.getElementById(moduloId);
    if (moduloObjetivo) {
        moduloObjetivo.classList.add('active');
    }
    
    // Usa el parámetro seguro del evento en vez de la variable global obsoleta
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
    }

    // Acciones automáticas al entrar en el módulo de categorías/dashboard
    if(moduloId === 'mod-categorias') {
        if (typeof ejecutarCalculosDashboardStock === "function") ejecutarCalculosDashboardStock();
        if (typeof filtrarYMostrarAnimalesConHistorial === "function") filtrarYMostrarAnimalesConHistorial();
    }
}

// Inicialización de utilidades visuales de tiempo por defecto al cargar la app
function arrancarAplicacionConSeguridad() {
    inicializarEstructuraCampoSmart()
        .then((db) => {
            console.log("Base de datos IndexedDB sincronizada con éxito en el celular.");
            if (typeof cargarInventarioAutomatico === "function") {
                cargarInventarioAutomatico();
            }
        })
        .catch((error) => {
            console.error("Fallo nativo al inicializar el contenedor de datos:", error);
        });
}

// Escucha estándar de carga web
window.addEventListener("DOMContentLoaded", () => {
    arrancarAplicacionConSeguridad();
    
    // CORRECCIÓN: Asegura el corte [0] para entregar un String de fecha limpio al input de Android
    const hoy = new Date().toISOString().split('T')[0];
    const camposFecha = ["san-fecha", "rep-fecha", "fin-fecha"];
    camposFecha.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = hoy;
    });
});

// RESPALDO NATIVO: Si corre en el celular, asegura el arranque cuando Capacitor esté listo
document.addEventListener("deviceready", () => {
    if (!dbInstancia) {
        arrancarAplicacionConSeguridad();
    }
}, false);
