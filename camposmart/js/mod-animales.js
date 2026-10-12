function cargarInventarioAutomatico() {
    // 1. Validar que la base de datos de tu archivo base-datos.js esté conectada
    if (!dbInstancia) {
        console.error("La base de datos IndexedDB aún no está inicializada.");
        return;
    }

    // 2. Abrir una transacción de lectura blindada en tu almacén de "animales"
    const transaccion = dbInstancia.transaction("animales", "readonly");
    const almacen = transaccion.objectStore("animales");
    const peticionLectura = almacen.getAll(); // Trae todas las cabezas guardadas

    peticionLectura.onsuccess = (evento) => {
        const datosAnimales = evento.target.result;
        const contenedor = document.getElementById('contenedor-galeria-vertical');
        if (!contenedor) return;

        // Limpiar el contenedor desplegable antes de dibujar
        contenedor.innerHTML = '';

        // Si el almacén está vacío, mostramos el mensaje elegante adaptado a tu diseño oscuro
        if (!datosAnimales || datosAnimales.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align:center; padding: 20px; color: #aaa; font-style: italic;">
                    No hay animales registrados en esta estancia aún.
                </div>
            `;
            return;
        }

        // 3. ORDENAR POR CARAVANA: Ordena de menor a mayor usando la clave primaria de tu base de datos
        const listaOrdenada = [...datosAnimales].sort((a, b) => {
            const caravanaA = String(a.caravana || '').toLowerCase();
            const caravanaB = String(b.caravana || '').toLowerCase();
            return caravanaA.localeCompare(caravanaB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 4. DIBUJAR LAS TARJETAS VERTICALES CON EL ESTILO OSCURO DE TU APLICACIÓN
        listaOrdenada.forEach(animal => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-animal-horizontal';
            tarjeta.style.backgroundColor = '#1e1e1e';
            tarjeta.style.border = '1px solid #333';
            tarjeta.style.marginBottom = '10px';
            tarjeta.style.borderRadius = '10px';
            tarjeta.style.display = 'flex';
            tarjeta.style.alignItems = 'center';
            tarjeta.style.overflow = 'hidden';

            // Usamos tu propiedad .foto; si no tiene, colocamos tu imagen por defecto de CampoSmart
            const rutaFoto = animal.foto ? animal.foto : 'camposmart/img/foto.png';
            
            tarjeta.innerHTML = `
                <div class="contenedor-foto-lista" onclick="abrirVisorFoto('${rutaFoto}')" style="width: 100px; height: 100px; flex-shrink: 0; cursor: pointer;">
                    <img src="${rutaFoto}" alt="Caravana ${animal.caravana}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="info-animal" style="color: #fff; padding: 10px; display: flex; flex-direction: column; gap: 4px; font-family: sans-serif;">
                    <span style="font-size: 1.1rem; font-weight: bold; color: #22c55e;">Caravana: ${animal.caravana || 'S/N'}</span>
                    <span style="color: #ccc;"><strong>Categoría:</strong> ${animal.categoria || 'Vaca'}</span>
                    <span style="color: #ccc;"><strong>Peso:</strong> ${animal.peso || '--'} kg</span>
                    <span style="color: #999; font-size: 0.85rem;"><strong>Detalles:</strong> ${animal.detalles || animal.observaciones || 'Sin observaciones'}</span>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });
    };

    peticionLectura.onerror = () => {
        const contenedor = document.getElementById('contenedor-galeria-vertical');
        if (contenedor) {
            contenedor.innerHTML = '<div style="color:red; text-align:center; padding:10px;">Error al leer la base de datos IndexedDB.</div>';
        }
    };
}
