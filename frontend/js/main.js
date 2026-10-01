// =====================================================
// StockCrate - JavaScript principal
// Sistema de Gestion de Inventarios
// =====================================================

// URL base del backend Flask. La cambio aqui y afecta todo el archivo.
const API_URL = "http://localhost:5000/api";

// Variables globales de la sesion y los datos
let sesion = null;
let productos = [];
let categorias = [];


// ── Sesion ──────────────────────────────────────────

function verificarSesion() {
  const guardada = localStorage.getItem("sesion");
  if (!guardada) {
    // Si no hay sesion, devuelvo al login
    window.location.href = "login.html";
    return false;
  }

  sesion = JSON.parse(guardada);

  // Pinto el nombre en el topbar y el rol en el sidebar
  const topbarUser = document.getElementById("topbar-user");
  const sidebarRol = document.getElementById("sidebar-rol");
  const avatar = document.getElementById("topbar-avatar");

  if (topbarUser) topbarUser.textContent = "Bienvenido, " + sesion.nombre;
  if (sidebarRol) sidebarRol.textContent = "Rol: " + sesion.rol;
  if (avatar) avatar.textContent = sesion.nombre.charAt(0).toUpperCase();

  return true;
}

function cerrarSesion() {
  if (!confirm("Cerrar sesion?")) return;
  localStorage.removeItem("sesion");
  window.location.href = "login.html";
}


// ── Navegacion entre secciones ─────────────────────

function mostrarSeccion(id) {
  // Oculto todas las secciones y muestro la pedida
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  const seccion = document.getElementById(id);
  if (seccion) seccion.classList.add("active");

  // Marco el item del menu como activo
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const itemActivo = document.querySelector('[data-seccion="' + id + '"]');
  if (itemActivo) itemActivo.classList.add("active");

  // Cambio el titulo del topbar
  const titulos = {
    "inicio": "Inicio - Panel de control",
    "productos": "Productos - Catalogo",
    "nuevo-producto": "Nuevo Producto",
    "categorias": "Categorias",
    "entradas": "Entradas de Inventario",
    "salidas": "Salidas de Inventario",
    "historial": "Historial de Movimientos",
    "proveedores": "Proveedores",
    "clientes": "Clientes"
  };
  const topbarTitle = document.querySelector(".topbar-title");
  if (topbarTitle) topbarTitle.textContent = titulos[id] || "StockCrate";

  // Cargo datos segun la seccion
  if (id === "productos") cargarProductos();
  if (id === "categorias") cargarCategorias();
  if (id === "proveedores") cargarProveedores();
  if (id === "clientes") cargarClientes();
  if (id === "historial") cargarHistorial();

  ocultarAlertas();
}


// ── Alertas ─────────────────────────────────────────

function mostrarAlerta(mensaje, tipo) {
  tipo = tipo || "success";

  const alerta = document.createElement("div");
  alerta.className = "alert alert-" + tipo;
  alerta.textContent = mensaje;

  const seccionActiva = document.querySelector(".page-section.active");
  if (seccionActiva) {
    seccionActiva.insertBefore(alerta, seccionActiva.firstChild);
  }

  setTimeout(() => alerta.remove(), 3500);
}

function ocultarAlertas() {
  document.querySelectorAll(".alert").forEach(a => a.remove());
}


// ── Productos ───────────────────────────────────────

async function cargarProductos() {
  const tbody = document.getElementById("tabla-productos-body");
  if (!tbody) return;

  try {
    const respuesta = await fetch(API_URL + "/productos");
    if (!respuesta.ok) throw new Error("Error al obtener productos");
    productos = await respuesta.json();
    renderizarProductos(productos);
  } catch (error) {
    // Si el backend no esta corriendo, muestro mensaje
    console.warn("No se pudo conectar con el backend:", error.message);
    tbody.innerHTML = '<tr><td colspan="7" class="tabla-vacia">No se pudo conectar con el servidor.</td></tr>';
  }
}

function renderizarProductos(lista) {
  const tbody = document.getElementById("tabla-productos-body");
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="tabla-vacia">No hay productos registrados.</td></tr>';
    actualizarStats();
    return;
  }

  tbody.innerHTML = lista.map(p => {
    let badge = "";
    if (p.stock === 0) {
      badge = '<span class="badge badge-danger">Sin stock</span>';
    } else if (p.stock <= p.stock_minimo) {
      badge = '<span class="badge badge-warning">Stock bajo</span>';
    } else {
      badge = '<span class="badge badge-success">Disponible</span>';
    }

    const precio = Number(p.precio_venta).toLocaleString("es-CO");
    const categoria = p.categoria_nombre || "Sin categoria";

    return `
            <tr>
                <td class="celda-codigo">${p.codigo}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${categoria}</td>
                <td>$${precio}</td>
                <td><strong>${p.stock}</strong> uds</td>
                <td>${badge}</td>
                <td>
                    <div class="celda-acciones">
                        <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${p.id_producto})">Eliminar</button>
                    </div>
                </td>
            </tr>`;
  }).join("");

  actualizarStats();
}

function buscarProducto(termino) {
  const t = termino.toLowerCase();
  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(t) ||
    p.codigo.toLowerCase().includes(t)
  );
  renderizarProductos(filtrados);
}


// ── Categorias ──────────────────────────────────────

async function cargarCategorias() {
  const tbody = document.getElementById("tabla-categorias-body");
  const selectNuevo = document.getElementById("np-categoria");
  if (!tbody) return;

  try {
    const respuesta = await fetch(API_URL + "/categorias");
    if (!respuesta.ok) throw new Error("Error al obtener categorias");
    categorias = await respuesta.json();

    tbody.innerHTML = categorias.map(c => `
            <tr>
                <td>${c.id_categoria}</td>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.descripcion || "-"}</td>
                <td>${c.activo ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Inactiva</span>'}</td>
            </tr>
        `).join("");

    // Lleno el select del formulario de nuevo producto
    if (selectNuevo) {
      selectNuevo.innerHTML = '<option value="">Selecciona una categoria</option>';
      categorias.forEach(c => {
        selectNuevo.innerHTML += `<option value="${c.id_categoria}">${c.nombre}</option>`;
      });
    }
  } catch (error) {
    console.warn("No se pudieron cargar categorias:", error.message);
    tbody.innerHTML = '<tr><td colspan="4" class="tabla-vacia">No se pudo conectar con el servidor.</td></tr>';
  }
}


// ── Proveedores ─────────────────────────────────────

async function cargarProveedores() {
  const tbody = document.getElementById("tabla-proveedores-body");
  if (!tbody) return;

  try {
    const respuesta = await fetch(API_URL + "/proveedores");
    if (!respuesta.ok) throw new Error("Error");
    const datos = await respuesta.json();

    tbody.innerHTML = datos.map(p => `
            <tr>
                <td>${p.id_proveedor}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.nit || "-"}</td>
                <td>${p.telefono || "-"}</td>
                <td>${p.correo || "-"}</td>
            </tr>
        `).join("");
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor.</td></tr>';
  }
}


// ── Clientes ────────────────────────────────────────

async function cargarClientes() {
  const tbody = document.getElementById("tabla-clientes-body");
  if (!tbody) return;

  try {
    const respuesta = await fetch(API_URL + "/clientes");
    if (!respuesta.ok) throw new Error("Error");
    const datos = await respuesta.json();

    tbody.innerHTML = datos.map(c => `
            <tr>
                <td>${c.id_cliente}</td>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.documento || "-"}</td>
                <td>${c.telefono || "-"}</td>
                <td>${c.correo || "-"}</td>
            </tr>
        `).join("");
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No se pudo conectar con el servidor.</td></tr>';
  }
}


// ── Historial ───────────────────────────────────────

async function cargarHistorial() {
  const tbody = document.getElementById("tabla-historial-body");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="tabla-vacia">El historial se conectara al backend Flask.</td></tr>';
}


// ── Formularios ─────────────────────────────────────

async function guardarProducto(e) {
  e.preventDefault();

  const datos = {
    codigo: document.getElementById("np-codigo").value.trim(),
    nombre: document.getElementById("np-nombre").value.trim(),
    id_categoria: parseInt(document.getElementById("np-categoria").value),
    precio_venta: parseFloat(document.getElementById("np-precio").value),
    precio_compra: 0,
    stock: parseInt(document.getElementById("np-stock").value),
    stock_minimo: parseInt(document.getElementById("np-stock-minimo").value) || 5,
    descripcion: document.getElementById("np-descripcion").value.trim()
  };

  if (!datos.codigo || !datos.nombre || !datos.id_categoria || isNaN(datos.precio_venta) || isNaN(datos.stock)) {
    mostrarAlerta("Completa todos los campos obligatorios.", "danger");
    return;
  }

  try {
    const respuesta = await fetch(API_URL + "/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
      const err = await respuesta.json();
      throw new Error(err.mensaje || "Error al guardar");
    }

    document.getElementById("form-nuevo-producto").reset();
    mostrarSeccion("productos");
    mostrarAlerta('Producto "' + datos.nombre + '" registrado.', "success");
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}

async function eliminarProducto(id) {
  if (!confirm("Eliminar este producto?")) return;

  try {
    const respuesta = await fetch(API_URL + "/productos/" + id, { method: "DELETE" });
    if (!respuesta.ok) throw new Error("No se pudo eliminar");
    mostrarAlerta("Producto eliminado.", "success");
    cargarProductos();
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}


// ── Entradas y salidas ─────────────────────────────

function cargarSelectProductos(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  if (productos.length === 0) {
    // Si no estan cargados aun, los traigo primero
    fetch(API_URL + "/productos")
      .then(r => r.json())
      .then(datos => {
        productos = datos;
        llenarSelect(select);
      })
      .catch(() => {
        select.innerHTML = '<option value="">No se pudo cargar</option>';
      });
  } else {
    llenarSelect(select);
  }
}

function llenarSelect(select) {
  select.innerHTML = '<option value="">Selecciona un producto</option>';
  productos.forEach(p => {
    select.innerHTML += `<option value="${p.id_producto}">${p.codigo} - ${p.nombre} (stock: ${p.stock})</option>`;
  });
}

async function guardarEntrada(e) {
  e.preventDefault();

  const idProducto = parseInt(document.getElementById("ent-producto").value);
  const cantidad = parseInt(document.getElementById("ent-cantidad").value);

  if (!idProducto || isNaN(cantidad) || cantidad <= 0) {
    mostrarAlerta("Completa todos los campos correctamente.", "danger");
    return;
  }

  try {
    const respuesta = await fetch(API_URL + "/movimientos/entrada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_producto: idProducto, cantidad: cantidad })
    });

    if (!respuesta.ok) {
      const err = await respuesta.json();
      throw new Error(err.mensaje || "Error al registrar entrada");
    }

    document.getElementById("form-entrada").reset();
    mostrarSeccion("productos");
    mostrarAlerta("Entrada registrada: +" + cantidad + " unidades.", "success");
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}

async function guardarSalida(e) {
  e.preventDefault();

  const idProducto = parseInt(document.getElementById("sal-producto").value);
  const cantidad = parseInt(document.getElementById("sal-cantidad").value);

  if (!idProducto || isNaN(cantidad) || cantidad <= 0) {
    mostrarAlerta("Completa todos los campos correctamente.", "danger");
    return;
  }

  try {
    const respuesta = await fetch(API_URL + "/movimientos/salida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_producto: idProducto, cantidad: cantidad })
    });

    if (!respuesta.ok) {
      const err = await respuesta.json();
      throw new Error(err.mensaje || "Error al registrar salida");
    }

    document.getElementById("form-salida").reset();
    mostrarSeccion("productos");
    mostrarAlerta("Salida registrada: -" + cantidad + " unidades.", "success");
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}


// ── Dashboard ───────────────────────────────────────

function actualizarStats() {
  const totalProductos = productos.length;
  const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= p.stock_minimo).length;
  const sinStock = productos.filter(p => p.stock === 0).length;
  const totalUnidades = productos.reduce((sum, p) => sum + p.stock, 0);

  const el = id => document.getElementById(id);
  if (el("stat-total")) el("stat-total").textContent = totalProductos;
  if (el("stat-unidades")) el("stat-unidades").textContent = totalUnidades;
  if (el("stat-bajo")) el("stat-bajo").textContent = stockBajo;
  if (el("stat-sin")) el("stat-sin").textContent = sinStock;
}


// ── Inicializacion ──────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Si no hay sesion, no dejo entrar
  if (!verificarSesion()) return;

  // Cargo productos al iniciar para tener el dashboard con datos
  cargarProductos();
  cargarCategorias();

  // Escucho la busqueda
  const inputBuscar = document.getElementById("buscar-producto");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", e => buscarProducto(e.target.value));
  }

  // Enlazo los formularios
  const formNuevo = document.getElementById("form-nuevo-producto");
  if (formNuevo) formNuevo.addEventListener("submit", guardarProducto);

  const formEntrada = document.getElementById("form-entrada");
  if (formEntrada) formEntrada.addEventListener("submit", guardarEntrada);

  const formSalida = document.getElementById("form-salida");
  if (formSalida) formSalida.addEventListener("submit", guardarSalida);
});