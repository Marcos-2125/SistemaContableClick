'use client';
import { useState, useEffect } from 'react';
// 1. Importamos la conexión
import { supabase } from './supabase';
// <<< AÑADE ESTO AQUÍ >>>
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';


export default function Home() {
// --- NAVEGACIÓN ---
const [pestaña, setPestaña] = useState('inicio');
const [accionInicio, setAccionInicio] = useState('menu');

// --- [NUEVO] ESTADO PARA SELECCIÓN DE PEDIDOS (ENTREGA SELECTIVA) ---
// Guardamos los IDs de los trabajos que el cliente se está llevando físicamente
const [pedidosSeleccionados, setPedidosSeleccionados] = useState<number[]>([]);

// --- ESTADOS PARA TUS LISTAS DE CONTROL ---
const [listaServicios, setListaServicios] = useState<string[]>([]);
const [costosProduccion, setCostosProduccion] = useState([
  { item: 'Tinta m2', precio: 2 },
  { item: 'Ojalillos cien', precio: 15 }
]);
const [nuevoServicioInput, setNuevoServicioInput] = useState('');
const [nuevoCostoInput, setNuevoCostoInput] = useState({ item: '', precio: '' });

// --- ESTADOS PARA CLIENTES ---
const [listaClientes, setListaClientes] = useState<any[]>([]);
const [nombreClienteInput, setNombreClienteInput] = useState('');
const [telClienteInput, setTelClienteInput] = useState('');
const [tipoClienteInput, setTipoClienteInput] = useState('Regular');

// --- ESTADOS DE FORMULARIO Y TALLER ---
const [tipoCliente, setTipoCliente] = useState('nuevo');
const [material, setMaterial] = useState('');
const [trabajos, setTrabajos] = useState<any[]>([]); 
const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
const [montoAcuenta, setMontoAcuenta] = useState<number | string>(0);
const [listaPedidosTaller, setListaPedidosTaller] = useState<any[]>([]);
const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);

// --- ESTADO PARA GUARDAR LOS DATOS DE LA TABLA VENTAS ---
const [listaVentas, setListaVentas] = useState<any[]>([]);

// --- ESTADOS PARA SUBIDA DE FOTOS (CLOUDINARY) ---
const [modalSubida, setModalSubida] = useState<{ abierto: boolean, pedidoId: number | null }>({ abierto: false, pedidoId: null });
const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
const [subiendo, setSubiendo] = useState(false);
const [listaGastos, setListaGastos] = useState<any[]>([]);

// --- ESTADOS PARA GESTIÓN DE GASTOS Y CAJA ---
const [misCategorias, setMisCategorias] = useState<any[]>([]);
const [nuevaCatNombre, setNuevaCatNombre] = useState('');
const [nuevaCatIcono, setNuevaCatIcono] = useState('💸');
const [gastoMonto, setGastoMonto] = useState<string>('');
const [gastoCategoria, setGastoCategoria] = useState('');
const [gastoDetalle, setGastoDetalle] = useState('');

// --- ESTADOS DE TOTALES DEL DÍA ---
const [totalIngresosHoy, setTotalIngresosHoy] = useState<number>(0);
const [totalGastosHoy, setTotalGastosHoy] = useState<number>(0);

// --- ESTADOS PARA DASHBOARD ---
const [mostrarDashboard, setMostrarDashboard] = useState(false);


// --- FUNCIONES DE PROCESAMIENTO PARA GRÁFICOS ---
const obtenerDatosVentasSemanales = () => {
    const ventasMap: { [key: string]: number } = {};
    const hoy = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(hoy.getDate() - i);
        const fechaFormateada = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        ventasMap[fechaFormateada] = 0;
    }

    listaVentas.forEach(v => {
        const fechaV = new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        if (ventasMap[fechaV] !== undefined) {
            ventasMap[fechaV] += (Number(v.pedido_total) || 0);
        }
    });

    return Object.entries(ventasMap).map(([name, total]) => ({ name, total }));
};

const obtenerDatosServiciosPopulares = () => {
    const conteo: { [key: string]: number } = {};
    listaVentas.forEach(v => {
        // Verificamos que detalle_precios exista y sea un array
        if (v.detalle_precios && Array.isArray(v.detalle_precios)) {
            v.detalle_precios.forEach((item: any) => {
                // Si item.servicio es null, usamos "S/N" (Sin Nombre)
                const nombre = item.servicio ? item.servicio.split(' ')[0] : "S/N";
                conteo[nombre] = (conteo[nombre] || 0) + (Number(item.cantidad) || 0);
            });
        }
    });
    return Object.entries(conteo)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};
const COLORS_DASHBOARD = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Función para el resumen rápido del dashboard
const obtenerResumenFinanciero = () => {
    const ventasTotales = listaVentas.reduce((acc, v) => acc + (Number(v.pedido_total) || 0), 0);
    const ingresosTotales = listaVentas.reduce((acc, v) => acc + (Number(v.cuenta) || 0), 0);
    const saldosPendientes = listaVentas.reduce((acc, v) => acc + (Number(v.saldo) || 0), 0);
    return { ventasTotales, ingresosTotales, saldosPendientes };
};
// ==========================================
  // --- FUNCIÓN PARA REFRESCAR TOTALES (NUEVO) ---
  // ==========================================
const refrescarTotalesHoy = async () => {
  // 1. Definimos el inicio y el fin del día en la zona horaria local
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  // Convertimos a formato ISO que Supabase entiende perfectamente para Timestamps
  const isoInicio = inicio.toISOString();
  const isoFin = fin.toISOString();

  console.log("Consultando desde:", isoInicio, "hasta:", isoFin);

  // 2. Sumar Gastos
  const { data: dataGastos, error: errG } = await supabase
    .from('gastos')
    .select('monto')
    .gte('fecha', isoInicio)
    .lte('fecha', isoFin);
  
  if (errG) console.error("Error Gastos:", errG);
  const sumaGastos = dataGastos?.reduce((acc, g) => acc + (Number(g.monto) || 0), 0) || 0;
  setTotalGastosHoy(sumaGastos);

  // 3. Sumar Ingresos Inteligente
  const { data: dataVentas, error: errV } = await supabase
    .from('registro_ventas')
    .select('cuenta, pedido_total, estado, saldo')
    .gte('fecha', isoInicio)
    .lte('fecha', isoFin);

  const sumaIngresos = dataVentas?.reduce((acc, v) => {
    // Si el pedido aún está pendiente, sumamos solo el adelanto (cuenta)
    if (v.estado === 'Pendiente') {
      return acc + (Number(v.cuenta) || 0);
    } 
    // Si el pedido ya se entregó hoy, el ingreso total es lo que pagó el cliente (pedido_total)
    else {
      return acc + (Number(v.pedido_total) || 0);
    }
  }, 0) || 0;

  setTotalIngresosHoy(sumaIngresos);
  }
  // ==========================================
  // --- CARGAR DATOS AL INICIAR ---
  // ==========================================
 // ==========================================
  // --- CARGAR DATOS AL INICIAR (CORREGIDO) ---
  // ==========================================
  useEffect(() => {
    async function descargarDatosIniciales() {
      try {
        // 1. Cargar Servicios
        const { data: dataServ } = await supabase
          .from('Servicios')
          .select('Nombre')
          .order('Nombre', { ascending: true });
        if (dataServ) setListaServicios(dataServ.map(s => s.Nombre));

        // 2. Cargar Clientes
        const { data: dataClie } = await supabase
          .from('Clientes')
          .select('*')
          .order('Nombre', { ascending: true });
        if (dataClie) setListaClientes(dataClie);

        // 3. Cargar Categorías de Gastos
        const { data: dataCats } = await supabase
          .from('categorias_gastos')
          .select('*')
          .order('nombre', { ascending: true });
        if (dataCats) setMisCategorias(dataCats);

        // 4. Cargar Totales y Ventas del mes (Para que el Dashboard funcione)
        await refrescarTotalesHoy();
        await cargarDatosVentas();
        
      } catch (error) {
        console.error("Error en la carga inicial:", error);
      }
    }

    descargarDatosIniciales();
  }, []);

  // ==========================================
  // --- FUNCIONES DE GASTOS (ACTUALIZADO) ---
  // ==========================================

  const guardarCategoriaBD = async () => {
    if (nuevaCatNombre.trim() === "") return alert("Escribe el nombre de la categoría");
    
    const { data, error } = await supabase
      .from('categorias_gastos')
      .insert([{ 
        nombre: nuevaCatNombre.toUpperCase(), 
        icono: nuevaCatIcono // <-- Ahora usa el icono que esté en el estado
      }])
      .select();

    if (!error && data) {
      setMisCategorias([...misCategorias, data[0]]);
      setNuevaCatNombre('');
      setNuevaCatIcono('💸'); // Reiniciamos al icono por defecto
      alert("Categoría guardada correctamente");
    } else {
      alert("Error: " + error?.message);
    }
  };

  const eliminarCategoria = async (id: number) => {
    if (confirm("¿Realmente deseas eliminar esta categoría? Los gastos ya registrados no se borrarán, pero no podrás elegirla de nuevo.")) {
      const { error } = await supabase
        .from('categorias_gastos')
        .delete()
        .eq('id', id);
        
      if (!error) {
        setMisCategorias(misCategorias.filter(c => c.id !== id));
      } else {
        alert("No se pudo eliminar: " + error.message);
      }
    }
  };

  const guardarGastoRealBD = async () => {
    if (!gastoMonto || Number(gastoMonto) <= 0) return alert("Por favor, ingresa un monto válido");
    if (!gastoCategoria) return alert("Debes seleccionar una categoría");

    const { error } = await supabase
      .from('gastos')
      .insert([{
        categoria: gastoCategoria,
        monto: Number(gastoMonto),
        descripcion: gastoDetalle.toUpperCase().trim(),
        fecha: new Date().toISOString()
      }]);

    if (!error) {
      // --- ESTO ES LO QUE FALTABA ---
      await refrescarTotalesHoy(); 
      // ------------------------------

      alert("Gasto registrado correctamente 💸");
      setGastoMonto('');
      setGastoDetalle('');
      setGastoCategoria('');
      setAccionInicio('menu'); 
    } else {
      alert("Error al registrar el gasto: " + error.message);
    }
  };
 // <<< LÓGICA ACTUALIZADA: VENTAS, GASTOS Y CLIENTES >>>

const cargarDatosVentas = async () => {
  const unMesAtras = new Date();
  unMesAtras.setMonth(unMesAtras.getMonth() - 1);

  const { data, error } = await supabase
    .from('registro_ventas')
    .select('*')
    .gte('fecha', unMesAtras.toISOString()) 
    .order('fecha', { ascending: false });

  if (data) setListaVentas(data);
  if (error) console.error("Error cargando histórico de ventas:", error);
};

const cargarHistorialGastos = async () => {
  // Traemos TODOS los gastos para asegurar que se vean
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error("Error en Supabase:", error.message);
    return;
  }

  if (data) {
    console.log("Gastos detectados en BD:", data.length); // Mira esto en la consola (F12)
    const datosLimpios = data.map(g => ({
      ...g,
      monto: Number(g.monto) || 0,
      // Extraemos mes y año para agrupar después
      mes: new Date(g.fecha).getMonth() + 1,
      anio: new Date(g.fecha).getFullYear()
    }));
    setListaGastos(datosLimpios);
  }
};
// ==========================================
// --- FUNCIONES DE CLIENTES ---
// ==========================================
const guardarClienteBD = async () => {
  if (nombreClienteInput.trim() === "") return alert("El nombre es obligatorio");
  const { data, error } = await supabase
    .from('Clientes')
    .insert([{ 
      Nombre: nombreClienteInput.toUpperCase(), 
      Telefono: telClienteInput,
      Tipo: tipoClienteInput 
    }])
    .select();

  if (!error) {
    setListaClientes([...listaClientes, data[0]]);
    setNombreClienteInput('');
    setTelClienteInput('');
    setTipoClienteInput('Regular');
  } else {
    alert("Error: " + error.message);
  }
};

const eliminarCliente = async (id: number, nombre: string) => {
  if (confirm(`¿Eliminar a ${nombre}?`)) {
    const { error } = await supabase.from('Clientes').delete().eq('id', id);
    if (!error) setListaClientes(listaClientes.filter(c => c.id !== id));
  }
};

// ==========================================
// --- FINALIZAR PEDIDO (CON REFRESCO TOTAL) ---
// ==========================================
const finalizarPedido = async () => {
  if (trabajos.length === 0) return alert("Debes agregar al menos un trabajo");
  if (!nombreClienteInput) return alert("El nombre del cliente es obligatorio");

  try {
    const idPedidoActual = Date.now(); 
    const totalNuevoTrabajo = trabajos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
    
    const desglosePreciosNuevos = trabajos.map(t => ({
      servicio: t.servicio.toUpperCase().trim(),
      cantidad: Number(t.cant),
      subtotal: Number(t.precio) 
    }));

    const resumenDetalleNuevo = trabajos.map(t => 
      `${t.cant} ${t.servicio.toUpperCase()} (${t.ancho}x${t.alto})`
    ).join(" // ");

    // PASO A: INSERTAR EN TALLER
    const filasParaTaller = trabajos.map(t => ({
      id_pedido: idPedidoActual,
      nombre_cliente: nombreClienteInput.toUpperCase().trim(),
      servicio: t.servicio,
      ancho: t.ancho,
      alto: t.alto,
      cantidad: Number(t.cant),
      detalle: t.detalle || '',
      estado: 'Pendiente'
    }));

    const { error: errorTaller } = await supabase.from('pedidos_activos').insert(filasParaTaller);
    if (errorTaller) throw errorTaller;

    // PASO B: ACTUALIZAR O CREAR EN CAJA
    const { data: pedidoExistente } = await supabase
      .from('registro_ventas')
      .select('*')
      .eq('nombre_cliente', nombreClienteInput.toUpperCase().trim())
      .eq('estado', 'Pendiente')
      .maybeSingle();

    if (pedidoExistente) {
      const preciosPrevios = Array.isArray(pedidoExistente.detalle_precios) ? pedidoExistente.detalle_precios : [];
      const nuevoDesgloseTotal = [...preciosPrevios, ...desglosePreciosNuevos];
      const nuevoTotalGlobal = Number(pedidoExistente.pedido_total) + totalNuevoTrabajo;
      const nuevaCuentaGlobal = Number(pedidoExistente.cuenta) + Number(montoAcuenta);
      const nuevoSaldoGlobal = Math.max(0, nuevoTotalGlobal - nuevaCuentaGlobal);

      const { error: errorUpdate } = await supabase
        .from('registro_ventas')
        .update({
          detalle_servicio: pedidoExistente.detalle_servicio + " // " + resumenDetalleNuevo,
          detalle_precios: nuevoDesgloseTotal, 
          pedido_total: nuevoTotalGlobal,
          cuenta: nuevaCuentaGlobal,
          saldo: nuevoSaldoGlobal
        })
        .eq('id_pedido', pedidoExistente.id_pedido);
        
      if (errorUpdate) throw errorUpdate;
    } else {
      const totalVenta = totalNuevoTrabajo;
      const cuentaVenta = Number(montoAcuenta);
      const saldoVenta = totalVenta - cuentaVenta;

      const { error: errorVenta } = await supabase
        .from('registro_ventas')
        .insert([{
          id_pedido: idPedidoActual,
          nombre_cliente: nombreClienteInput.toUpperCase().trim(),
          telefono_cliente: telClienteInput,
          detalle_servicio: resumenDetalleNuevo,
          detalle_precios: desglosePreciosNuevos, 
          pedido_total: totalVenta,
          cuenta: cuentaVenta,
          saldo: saldoVenta,
          estado: 'Pendiente'
        }]);
      if (errorVenta) throw errorVenta;
    }

    // --- ACTUALIZACIÓN MASIVA DE DATOS ---
    await refrescarTotalesHoy(); // Actualiza círculos de arriba
    await cargarDatosVentas();   // Actualiza lista de ventas del Dashboard
    await cargarHistorialGastos(); // Asegura que los gastos no se pierdan al refrescar
    
    alert("¡Pedido guardado correctamente! 🚀");
    
    setTrabajos([]);
    setNombreClienteInput('');
    setTelClienteInput('');
    setMontoAcuenta(0);
    setAccionInicio('menu');

  } catch (err: any) {
    console.error("Error al guardar:", err);
    alert("Hubo un problema: " + err.message);
  }
}; // <--- AQUÍ CIERRA LA FUNCIÓN CORRECTAMENTE

  // ==========================================
  // --- CONTROL DE TALLER ---
  // ==========================================
  const cargarPedidosTaller = async () => {
    const { data } = await supabase
      .from('pedidos_activos')
      .select('*')
      .order('id', { ascending: true }); // Traemos todos para poder filtrar en las vistas
    if (data) setListaPedidosTaller(data);
  };

  const cambiarEstadoPedido = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from('pedidos_activos')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    if (!error) cargarPedidosTaller(); 
  };
const entregarPedidoFinalv2 = async (nombreCliente: string) => {
  try {
    const nombreLimpio = nombreCliente.trim();
    
    // 1. Buscamos la venta activa de este cliente
    const ventaActual = listaVentas.find(v => v.nombre_cliente?.trim() === nombreLimpio && v.estado === 'Pendiente');
    
    if (!ventaActual) {
      alert("No se encontró deuda pendiente para: " + nombreLimpio);
      return;
    }

    // 2. Preguntar cuánto paga hoy
    const saldoActual = Number(ventaActual.saldo) || 0;
    const montoIngresado = window.prompt(
      `CLIENTE: ${nombreLimpio}\nSALDO PENDIENTE: ${saldoActual} Bs.\n\n¿Cuánto está pagando/abonando ahora?`, 
      saldoActual.toString()
    );

    if (montoIngresado === null) return; // Si cancela el prompt

    const pagoHoy = parseFloat(montoIngresado) || 0;
    const nuevoSaldo = Math.max(0, saldoActual - pagoHoy);
    const nuevaCuenta = (Number(ventaActual.cuenta) || 0) + pagoHoy;

    // 3. ACTUALIZAR CAJA (registro_ventas)
    const { error: errVenta } = await supabase
      .from('registro_ventas')
      .update({ 
        cuenta: nuevaCuenta, 
        saldo: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'Entregado' : 'Pendiente' 
      })
      .eq('id_pedido', ventaActual.id_pedido);

    if (errVenta) throw errVenta;

    // 4. ARCHIVAR EN TALLER (Solo los IDs marcados en los checkboxes)
    if (pedidosSeleccionados.length > 0) {
      const { error: errTaller } = await supabase
        .from('pedidos_activos')
        .update({ estado: 'Archivado' })
        .in('id', pedidosSeleccionados); // Filtra por la lista de seleccionados

      if (errTaller) throw errTaller;
    }

    alert(`✅ Cobro registrado: ${pagoHoy} Bs.\nSaldo restante: ${nuevoSaldo} Bs.`);
    
    // 5. Limpiar y refrescar
    setPedidosSeleccionados([]);
    await cargarDatosVentas();
    await cargarPedidosTaller();
    await refrescarTotalesHoy();

  } catch (err: any) { 
    console.error(err);
    alert("Error: " + err.message); 
  }
};
  // ==========================================
  // --- SUBIDA A CLOUDINARY ---
  // ==========================================
  const subirACloudinary = async (file: File, pedidoId: number) => {
    setSubiendo(true); 
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'fotos_pedidos'); 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/debs3gk6x/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        const { error } = await supabase
          .from('pedidos_activos')
          .update({ url_foto: data.secure_url })
          .eq('id', pedidoId);

        if (!error) {
          alert("¡Foto guardada! 📸");
          setModalSubida({ abierto: false, pedidoId: null });
          setPrevisualizacion(null);
          setArchivoSeleccionado(null);
          cargarPedidosTaller(); 
        }
      }
    } catch (err) {
      alert("Error de conexión con Cloudinary");
    } finally {
      setSubiendo(false); 
    }
  };

  const manejarPegadoEnModal = (e: any) => {
    if (!modalSubida.abierto) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setArchivoSeleccionado(file);
          setPrevisualizacion(URL.createObjectURL(file));
        }
      }
    }
  };

  // <<< EFECTO DE CARGA SEGÚN PESTAÑA >>>
 useEffect(() => {
  // CADA VEZ que cambies de pestaña, reseteamos la selección para evitar errores
  setPedidosSeleccionados([]); 

  if (pestaña === 'pedidos' || pestaña === 'taller' || pestaña === 'reportes') {
    cargarPedidosTaller();
    cargarDatosVentas();
  }
}, [pestaña]);

  // --- FUNCIONES DE SERVICIOS ---
  const eliminarServicio = async (nombreEliminar: string) => {
    if (confirm(`¿Eliminar "${nombreEliminar}"?`)) {
      const { error } = await supabase.from('Servicios').delete().eq('Nombre', nombreEliminar);
      if (!error) setListaServicios(listaServicios.filter(s => s !== nombreEliminar));
    }
  };

  const editarServicio = async (nombreActual: string) => {
    const nuevoNombre = prompt("Editar nombre:", nombreActual);
    if (nuevoNombre?.trim()) {
      const nombreMayus = nuevoNombre.toUpperCase();
      const { error } = await supabase.from('Servicios').update({ Nombre: nombreMayus }).eq('Nombre', nombreActual);
      if (!error) setListaServicios(listaServicios.map(s => s === nombreActual ? nombreMayus : s));
    }
  };

  const guardarServicioBD = async () => {
    if (nuevoServicioInput.trim()) {
      const nombreMayus = nuevoServicioInput.toUpperCase();
      const { error } = await supabase.from('Servicios').insert([{ Nombre: nombreMayus }]);
      if (!error) {
        setListaServicios([...listaServicios, nombreMayus]);
        setNuevoServicioInput('');
      }
    }
  };
 return (
    <main className="min-h-screen bg-gray-100 font-sans pb-24 text-slate-900">

      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">Control Click</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Taller de Impresión</p>
        </div>
        <div className="bg-blue-600 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-md">M</div>
      </header>

      <div className="p-4">
        {pestaña === 'inicio' && (
          <section className="animate-in fade-in duration-500">

            {accionInicio === 'menu' && (
              <>
                {/* --- SECCIÓN DE RESUMEN DE CAJA ACTUALIZADA --- */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-2xl border-b-4 border-green-500 shadow-sm transition-all">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Hoy Ingresó</p>
                    <p className="text-xl font-bold text-green-600 font-mono">
                      {totalIngresosHoy.toFixed(2)} Bs.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-b-4 border-red-500 shadow-sm transition-all">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Hoy Gastó</p>
                    <p className="text-xl font-bold text-red-600 font-mono">
                      {totalGastosHoy.toFixed(2)} Bs.
                    </p>
                  </div>
                </div>

                {/* BARRA DE BALANCE NETO */}
                <div className="bg-blue-600 p-3 rounded-2xl mb-8 shadow-md flex justify-between items-center px-6">
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Balance Neto</span>
                  <span className="text-white text-lg font-bold font-mono">
                    {(totalIngresosHoy - totalGastosHoy).toFixed(2)} Bs.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                        {/* BOTÓN TRANSFORMADO: De Cobrar Venta a Análisis */}
                        <button 
                          onClick={() => {
                            cargarDatosVentas(); // Carga los datos de Supabase antes de abrir
                            setMostrarDashboard(true); // Activa el modal del Dashboard
                          }} 
                          className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all group"
                        >
                          <span className="text-4xl group-hover:scale-110 transition-transform">📊</span>
                          <span className="font-bold text-sm text-slate-700">Análisis</span>
                        </button>   
                  
                  <button onClick={() => setAccionInicio('nuevo-gasto')} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-4xl">💸</span>
                    <span className="font-bold text-sm">Gasto</span>
                  </button>

                  <button onClick={() => setAccionInicio('nuevo-cliente')} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-4xl">👤</span>
                    <span className="font-bold text-sm">Cliente</span>
                  </button>
                  <button onClick={() => setAccionInicio('nuevo-pedido')} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-4xl">📋</span>
                    <span className="font-bold text-sm">Pedido</span>
                  </button>
                  <button onClick={() => setAccionInicio('config-servicios')} className="bg-slate-800 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-3xl">⚙️</span>
                    <span className="font-bold text-[10px] uppercase text-center leading-tight">Lista de<br />Servicios</span>
                  </button>

                  <button onClick={() => setAccionInicio('config-categorias-gastos')} className="bg-slate-800 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-3xl">🛠️</span>
                    <span className="font-bold text-[10px] uppercase text-center leading-tight">Categorías<br />de Gastos</span>
                  </button>
                </div>
              </>
            )}

            {/* VISTA NUEVA: CONFIGURAR CATEGORÍAS DE GASTOS */}
            {accionInicio === 'config-categorias-gastos' && (
              <div className="bg-white p-6 rounded-3xl shadow-xl animate-in slide-in-from-bottom border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 italic">Configurar Categorías</h3>
                  <button onClick={() => setAccionInicio('menu')} className="bg-slate-100 p-2 rounded-full font-bold">✕</button>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-2 ml-1 tracking-widest">Crear Nueva</p>
                  <div className="flex gap-2">
                    <select 
                      value={nuevaCatIcono} 
                      onChange={(e) => setNuevaCatIcono(e.target.value)}
                      className="bg-white border-none rounded-xl p-2 shadow-sm text-xl"
                    >
                      <option>💸</option><option>👤</option><option>⚡</option><option>🏗️</option><option>🧪</option><option>🍕</option>
                    </select>
                    <input 
                      type="text" 
                      value={nuevaCatNombre}
                      onChange={(e) => setNuevoCostoInput({ ...nuevoCostoInput, item: e.target.value })} // O usa tu estado nuevaCatNombre si lo definiste
                      onInput={(e:any) => setNuevaCatNombre(e.target.value)} 
                      placeholder="Ej: ALQUILER" 
                      className="flex-1 p-3 bg-white rounded-xl font-bold text-sm border-none shadow-sm outline-none"
                    />
                    <button onClick={guardarCategoriaBD} className="bg-blue-600 text-white px-5 rounded-xl font-bold">+</button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto italic">
                  {misCategorias.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold uppercase text-slate-700">{cat.icono} {cat.nombre}</span>
                      <button onClick={() => eliminarCategoria(cat.id)} className="text-red-400 text-[10px] font-black uppercase">Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA NUEVA: REGISTRAR GASTO REAL */}
            {accionInicio === 'nuevo-gasto' && (
              <div className="bg-white p-6 rounded-[35px] shadow-2xl animate-in slide-in-from-bottom border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-red-600 uppercase italic">Anotar Gasto</h3>
                  <button onClick={() => setAccionInicio('menu')} className="bg-slate-100 p-2 rounded-full font-bold text-slate-400">✕</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Monto en Bs.</label>
                    <input 
                      type="number" 
                      value={gastoMonto}
                      onChange={(e) => setGastoMonto(e.target.value)}
                      placeholder="0.00" 
                      className="w-full bg-transparent border-none p-0 text-4xl font-black text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {misCategorias.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setGastoCategoria(cat.nombre)}
                        className={`p-3 rounded-2xl font-bold text-[10px] uppercase transition-all border ${
                          gastoCategoria === cat.nombre 
                          ? 'bg-red-600 border-red-600 text-white shadow-lg scale-95' 
                          : 'bg-white border-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="block text-xl mb-1">{cat.icono}</span>
                        {cat.nombre}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text" 
                    value={gastoDetalle}
                    onChange={(e) => setGastoDetalle(e.target.value)}
                    placeholder="Detalle (Ej: Compra de tintas)" 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold shadow-sm outline-none"
                  />

                  <button 
                    onClick={guardarGastoRealBD}
                    className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2"
                  >
                    Guardar Gasto 💸
                  </button>
                </div>
              </div>
            )}

            {/* VISTA: CONFIGURAR SERVICIOS */}
            {accionInicio === 'config-servicios' && (
              <div className="bg-white p-6 rounded-3xl shadow-xl animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black uppercase italic text-blue-600">Catálogo de Servicios</h2>
                  <button onClick={() => setAccionInicio('menu')} className="bg-gray-100 p-2 rounded-full font-bold">✕</button>
                </div>
                <div className="flex gap-2 mb-6">
                  <input placeholder="Nombre (Ej: Lona 13oz)" className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm border outline-none" value={nuevoServicioInput} onChange={(e) => setNuevoServicioInput(e.target.value)} />
                  <button onClick={guardarServicioBD} className="bg-blue-600 text-white px-5 rounded-xl font-bold">+</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {listaServicios.map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold uppercase italic text-slate-700">{s}</span>
                      <div className="flex gap-2">
                        <button onClick={() => editarServicio(s)} className="bg-amber-100 p-2 rounded-lg text-amber-600 text-xs">✏️</button>
                        <button onClick={() => eliminarServicio(s)} className="bg-red-100 p-2 rounded-lg text-red-600 text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA: CONFIGURAR COSTOS */}
            {accionInicio === 'config-costos' && (
              <div className="bg-white p-6 rounded-3xl shadow-xl animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black uppercase italic text-red-600">Precios de Producción</h2>
                  <button onClick={() => setAccionInicio('menu')} className="bg-gray-100 p-2 rounded-full font-bold">✕</button>
                </div>
                <div className="space-y-3 mb-6">
                  <input placeholder="Material o Insumo" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border outline-none" value={nuevoCostoInput.item} onChange={(e) => setNuevoCostoInput({ ...nuevoCostoInput, item: e.target.value })} />
                  <div className="flex gap-2">
                    <input type="number" placeholder="Costo Bs." className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm border outline-none" value={nuevoCostoInput.precio} onChange={(e) => setNuevoCostoInput({ ...nuevoCostoInput, precio: e.target.value })} />
                    <button onClick={() => { setCostosProduccion([...costosProduccion, { item: nuevoCostoInput.item, precio: nuevoCostoInput.precio }]); setNuevoCostoInput({ item: '', precio: '' }); }} className="bg-red-500 text-white px-5 rounded-xl font-bold italic">OK</button>
                  </div>
                </div>
                <div className="space-y-2 italic">
                  {costosProduccion.map((c, i) => (
                    <div key={i} className="flex justify-between p-3 bg-red-50 rounded-xl text-xs font-bold border border-red-100">
                      <span>{c.item}</span>
                      <span className="text-red-600">{c.precio} Bs.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA: REGISTRO DE CLIENTES ACTUALIZADO */}
            {accionInicio === 'nuevo-cliente' && (
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-purple-600 uppercase italic">Gestión de Clientes</h2>
                  <button onClick={() => setAccionInicio('menu')} className="bg-gray-100 p-2 rounded-full">✕</button>
                </div>
                
                <div className="space-y-4 mb-8">
                  <input 
                    type="tel" 
                    placeholder="Telefono" 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500 font-bold"
                    value={telClienteInput}
                    onChange={(e) => setTelClienteInput(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Nombre Completo" 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500 font-bold"
                    value={nombreClienteInput}
                    onChange={(e) => setNombreClienteInput(e.target.value)}
                  />

                  {/* NUEVO: SELECTOR DE TIPO */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    {['Regular', 'Empresa', 'Decoradora'].map((t) => (
                      <button 
                        key={t}
                        onClick={() => setTipoClienteInput(t)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${tipoClienteInput === t ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400'}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={guardarClienteBD}
                    className="w-full bg-purple-600 text-white p-5 rounded-2xl font-black shadow-lg uppercase italic"
                  >
                    Registrar Cliente
                  </button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lista de Clientes</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {listaClientes.map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-xs font-bold uppercase">{c.Nombre}</p>
                          <div className="flex gap-2 items-center">
                            <p className="text-[10px] text-gray-500">{c.Telefono}</p>
                            <span className="text-[8px] font-black bg-gray-200 px-2 py-0.5 rounded text-gray-600 uppercase">
                              {c.Tipo || 'Regular'}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => eliminarCliente(c.id, c.Nombre)} className="text-red-400 p-2">🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
{/* VISTA: REGISTRO DE PEDIDO - DISEÑO ESTILO RECIBO PROFESIONAL */}
          {accionInicio === 'nuevo-pedido' && (
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300 max-w-md mx-auto overflow-hidden mb-24">
              
              {/* Encabezado del Recibo */}
              <div className="bg-slate-800 p-4 text-center relative">
                <h2 className="text-white font-black italic tracking-widest uppercase text-sm">Nota de Venta / Recibo</h2>
                <p className="text-slate-400 text-[9px] font-bold tracking-tighter uppercase">Click Gestión de Inventario</p>
                <button 
                  onClick={() => { setAccionInicio('menu'); setTrabajos([]); setNombreClienteInput(''); setTelClienteInput(''); }} 
                  className="absolute right-4 top-4 text-slate-400 hover:text-white font-bold"
                >✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* 1. SECCIÓN: DATOS DEL CLIENTE */}
                <div className="space-y-2 border-b pb-4">
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Teléfono</label>
                      <input 
                        type="tel" 
                        className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-blue-500 shadow-sm"
                        value={telClienteInput}
                        onChange={(e) => {
                          setTelClienteInput(e.target.value);
                          const encontrado = listaClientes.find(c => c.Telefono === e.target.value);
                          if (encontrado) { 
                            setNombreClienteInput(encontrado.Nombre); 
                            setTipoClienteInput(encontrado.Tipo); 
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 relative">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cliente</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-xs uppercase outline-none shadow-sm"
                        value={nombreClienteInput}
                        onChange={(e) => {
                          setNombreClienteInput(e.target.value);
                          setMostrarSugerencias(true);
                          if (e.target.value === "") { setTelClienteInput(""); setMostrarSugerencias(false); }
                        }}
                      />
                      {/* Buscador de sugerencias */}
                      {mostrarSugerencias && nombreClienteInput.length > 1 && (
                        <div className="absolute z-30 w-full mt-1 bg-white shadow-2xl rounded-2xl border border-gray-100 max-h-40 overflow-y-auto">
                          {listaClientes
                            .filter(c => c.Nombre.toLowerCase().includes(nombreClienteInput.toLowerCase()))
                            .map(c => (
                              <div 
                                key={c.id} 
                                className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b text-[10px] font-black uppercase transition-colors"
                                onClick={() => {
                                  setNombreClienteInput(c.Nombre);
                                  setTelClienteInput(c.Telefono);
                                  setTipoClienteInput(c.Tipo || 'Regular');
                                  setMostrarSugerencias(false);
                                }}
                              >
                                {c.Nombre}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN: AGREGAR TRABAJO */}
<div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
  <select
    className="w-full p-3 rounded-xl border border-blue-200 text-xs font-black uppercase bg-white outline-none"
    value={material}
    onChange={(e) => setMaterial(e.target.value)}
  >
    <option value="">-- SELECCIONAR SERVICIO --</option>
    {listaServicios.map((s, i) => <option key={i} value={s}>{s}</option>)}
  </select>

  {/* Inputs con etiquetas de Metros (m) */}
  <div className="grid grid-cols-3 gap-2">
    <div className="relative">
      <label className="text-[8px] font-black text-blue-500 absolute -top-2 left-2 bg-white px-1">ANCHO (m)</label>
      <input id="ancho" type="number" step="0.01" placeholder="0.00" className="p-3 w-full rounded-xl text-xs font-bold border border-blue-200 text-center shadow-sm outline-none focus:border-blue-500" />
    </div>
    <div className="relative">
      <label className="text-[8px] font-black text-blue-500 absolute -top-2 left-2 bg-white px-1">ALTO (m)</label>
      <input id="alto" type="number" step="0.01" placeholder="0.00" className="p-3 w-full rounded-xl text-xs font-bold border border-blue-200 text-center shadow-sm outline-none focus:border-blue-500" />
    </div>
    <div className="relative">
      <label className="text-[8px] font-black text-gray-400 absolute -top-2 left-2 bg-white px-1">CANT.</label>
      <input id="cant" type="number" defaultValue="1" className="p-3 w-full rounded-xl text-xs font-bold border border-blue-200 text-center shadow-sm outline-none" />
    </div>
  </div>

  <p className="text-[9px] text-blue-600 font-bold italic px-1">💡 Ejemplo: 60cm poner 0.60 | 1.2 metros poner 1.20</p>

  <input 
    id="detalle_trabajo" 
    type="text" 
    placeholder="DETALLES (Ej: Ojalillos, Lona Mate, Corte recto)" 
    className="w-full p-3 rounded-xl border border-blue-200 text-[10px] font-bold uppercase outline-none shadow-sm" 
  />

  <div className="flex gap-2 items-center">
    <div className="flex-1 bg-white border-2 border-emerald-400 rounded-xl flex items-center px-3 shadow-sm">
      <span className="text-[10px] font-black text-emerald-600 mr-2">Bs.</span>
      <input id="precio_final" type="number" placeholder="PRECIO TOTAL" className="w-full py-3 font-black text-sm outline-none bg-transparent" />
    </div>
    <button 
      onClick={() => {
        const s = material;
        const an = (document.getElementById('ancho') as HTMLInputElement).value;
        const al = (document.getElementById('alto') as HTMLInputElement).value;
        const ct = (document.getElementById('cant') as HTMLInputElement).value;
        const pr = (document.getElementById('precio_final') as HTMLInputElement).value;
        const dt = (document.getElementById('detalle_trabajo') as HTMLInputElement).value;
        
        if(!s || !pr || !an || !al) return alert("Falta llenar datos (Servicio, Medidas o Precio)");

        // --- VALIDACIÓN DE SEGURIDAD PARA METROS ---
        if (parseFloat(an) >= 10 || parseFloat(al) >= 10) {
          const confirmar = confirm(`Has puesto ${an}x${al} metros. ¿Estás seguro que no son centímetros?\n\nSi son centímetros, usa 0.60 en lugar de 60.`);
          if (!confirmar) return;
        }
        
        setTrabajos([...trabajos, { 
          servicio: s, ancho: an, alto: al, cant: ct, precio: Number(pr), detalle: dt 
        }]);

        // Limpiar campos de trabajo
        setMaterial('');
        (document.getElementById('ancho') as HTMLInputElement).value = '';
        (document.getElementById('alto') as HTMLInputElement).value = '';
        (document.getElementById('cant') as HTMLInputElement).value = '1';
        (document.getElementById('precio_final') as HTMLInputElement).value = '';
        (document.getElementById('detalle_trabajo') as HTMLInputElement).value = '';
      }}
      className="bg-emerald-500 text-white h-12 px-4 rounded-xl font-black text-xs shadow-lg active:scale-95"
    >
      + AÑADIR
    </button>
  </div>
</div>

                {/* 3. LISTA DE ITEMS AGREGADOS */}
                {trabajos.length > 0 && (
                  <div className="border border-dashed border-slate-300 rounded-2xl overflow-hidden shadow-inner">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-50 border-b">
                        <tr className="text-slate-400 font-black">
                          <th className="p-2 text-left">DESCRIPCIÓN</th>
                          <th className="p-2 text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trabajos.map((t, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="p-2">
                              <p className="font-black uppercase text-blue-700">{t.servicio}</p>
                              <p className="text-gray-400 font-bold">{t.ancho}x{t.alto} | {t.cant} pz</p>
                              {t.detalle && <p className="text-[8px] italic text-gray-500 leading-tight">{t.detalle}</p>}
                            </td>
                            <td className="p-2 text-right font-black text-slate-700">{t.precio.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. TOTALES, A CUENTA Y SALDO */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 space-y-3 shadow-md">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Total Pedido:</span>
                    <span className="text-xl font-black text-slate-800 font-mono">
                      {trabajos.reduce((acc, t) => acc + (t.precio || 0), 0).toFixed(2)} Bs.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-emerald-600 uppercase ml-1 italic">A Cuenta:</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        className="w-full p-3 bg-white border-2 border-emerald-200 rounded-2xl font-black text-emerald-700 outline-none text-center shadow-sm"
                        onChange={(e) => setMontoAcuenta(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-red-500 uppercase ml-1 italic">Saldo Pendiente:</label>
                      <div className="w-full p-3 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-red-600 text-center text-sm font-mono shadow-sm">
                        {(trabajos.reduce((acc, t) => acc + (t.precio || 0), 0) - Number(montoAcuenta)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={finalizarPedido}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2 italic"
                  >
                    💾 Guardar y Finalizar Recibo
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
{/* ========================================== */}
{/* --- PESTAÑA PEDIDOS (CORREGIDA CON FILTRO) --- */}
{/* ========================================== */}
{pestaña === 'pedidos' && (
  <section className="animate-in fade-in duration-500 p-6 pb-32 bg-[#F8FAFC]">
    {/* Header Simple */}
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Cola de Diseño</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Taller Activo</p>
        </div>
      </div>
      <button onClick={cargarPedidosTaller} className="text-slate-400 hover:text-blue-600 p-2 transition-colors">
        <span className="text-xl">🔄</span>
      </button>
    </div>

    <div className="space-y-4">
      {Object.values(
        listaPedidosTaller
          // 🔥 CORRECCIÓN 1: Filtramos los archivados ANTES de empezar a agrupar
          .filter((p: any) => p.estado !== 'Archivado')
          .reduce((acc: any, pedido: any) => {
            if (!acc[pedido.nombre_cliente]) {
              const infoCliente = listaClientes.find(c => c.Nombre === pedido.nombre_cliente);
              acc[pedido.nombre_cliente] = { 
                nombre: pedido.nombre_cliente,
                telefono: infoCliente?.Telefono || '',
                tipo: infoCliente?.Tipo || 'Cliente',
                trabajos: [],
                total: 0, espera: 0, haciendo: 0, listos: 0
              };
            }
            acc[pedido.nombre_cliente].trabajos.push(pedido);
            acc[pedido.nombre_cliente].total++;
            
            // Contadores de etiquetas
            if (pedido.estado === 'Pendiente') acc[pedido.nombre_cliente].espera++;
            if (pedido.estado === 'Diseñando') acc[pedido.nombre_cliente].haciendo++;
            if (pedido.estado === 'Para Imprimir' || pedido.estado === 'Finalizado') acc[pedido.nombre_cliente].listos++;
            
            return acc;
          }, {})
      )
      // 🔥 CORRECCIÓN 2: El filtro final ahora solo muestra grupos que tienen trabajos pendientes de terminar
      .filter((grupo: any) => grupo.listos < grupo.total)
      .map((grupo: any, idx: number) => {
        const abierto = clienteAbierto === grupo.nombre;

        return (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
            
            {/* HEADER CLIENTE (Sin cambios, tu diseño es excelente) */}
            <div 
              onClick={() => setClienteAbierto(abierto ? null : grupo.nombre)}
              className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${abierto ? 'bg-slate-50/80 border-b border-slate-100' : ''}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-slate-800 text-base">{grupo.nombre}</h3>
                  <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-bold uppercase tracking-tighter">
                    {grupo.tipo}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{grupo.telefono}</p>
              </div>

              <div className="flex gap-3 items-center mr-4">
                {grupo.espera > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span><span className="text-[10px] font-bold text-slate-400">{grupo.espera}</span></div>}
                {grupo.haciendo > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span><span className="text-[10px] font-bold text-orange-500">{grupo.haciendo}</span></div>}
                <div className="text-[10px] font-bold text-slate-300">/</div>
                <div className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{grupo.total}</div>
              </div>
              <span className={`text-slate-300 transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
            </div>

            {/* LISTA DE TRABAJOS (Igual a tu código, pero ahora los datos vienen filtrados) */}
            {abierto && (
              <div className="p-3 space-y-2 bg-[#FCFDFF]">
                {grupo.trabajos.map((trabajo: any) => {
                  const listo = trabajo.estado === 'Para Imprimir' || trabajo.estado === 'Finalizado';
                  const doing = trabajo.estado === 'Diseñando';

                  return (
                    <div key={trabajo.id} className={`p-4 rounded-xl border transition-all ${listo ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${listo ? 'text-slate-300' : 'text-blue-500'}`}>
                            {trabajo.servicio}
                          </p>
                          <h4 className={`text-sm font-semibold uppercase ${listo ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                            {trabajo.detalle || 'Trabajo sin detalle'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Dimensiones: {trabajo.ancho} x {trabajo.alto} m</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            x{trabajo.cantidad}
                          </span>
                        </div>
                      </div>

                      {/* Botón de subida y estados se mantienen igual... */}
                      {!listo && (
                         <div className="mb-4">
                            <button 
                              onClick={() => setModalSubida({ abierto: true, pedidoId: trabajo.id })}
                              className={`w-full h-10 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-all ${trabajo.url_foto ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                            >
                                <span className="text-lg">{trabajo.url_foto ? '✅' : '📸'}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{trabajo.url_foto ? 'Ver / Cambiar Captura' : 'Subir Captura (Ctrl+V)'}</span>
                            </button>
                         </div>
                      )}

                      <div className="flex gap-2">
                        {!listo ? (
                          <>
                            <button onClick={() => cambiarEstadoPedido(trabajo.id, 'Pendiente')} className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase border ${trabajo.estado === 'Pendiente' ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>Espera</button>
                            <button onClick={() => cambiarEstadoPedido(trabajo.id, 'Diseñando')} className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase border ${doing ? 'bg-orange-50 text-orange-600' : 'text-slate-300'}`}>Diseñar</button>
                            <button onClick={() => { if(confirm("¿Finalizar diseño?")) cambiarEstadoPedido(trabajo.id, 'Para Imprimir') }} className="px-4 h-9 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase">Listo</button>
                          </>
                        ) : (
                          <div className="w-full text-center py-1">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Enviado a Impresión</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
)}
    {/* ========================================== */}
    {/* --- PESTAÑA TALLER (ENFOQUE VISUAL) --- */}
    {/* ========================================== */}
      {pestaña === 'taller' && (
      <section className="animate-in fade-in duration-500 p-4 pb-32 bg-slate-900 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Panel de Impresión</h2>
          <button onClick={cargarPedidosTaller} className="bg-slate-800 text-slate-400 p-2 rounded-xl">🔄</button>
        </div>

        {/* Filtros Rápidos */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Pendientes</p>
            <p className="text-xl font-black text-white">{listaPedidosTaller.filter(p => p.estado === 'Para Imprimir').length}</p>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
            <p className="text-[10px] font-bold text-blue-200 uppercase">En Máquina</p>
            <p className="text-xl font-black text-white">{listaPedidosTaller.filter(p => p.estado === 'Imprimiendo').length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {listaPedidosTaller
            .filter(p => p.estado === 'Para Imprimir' || p.estado === 'Imprimiendo')
            .map((trabajo) => (
              <div key={trabajo.id} className={`relative overflow-hidden rounded-[32px] border-2 transition-all ${trabajo.estado === 'Imprimiendo' ? 'border-blue-500 bg-slate-800' : 'border-slate-800 bg-slate-800/50'}`}>
                
                {/* Imagen de Fondo o Preview */}
                <div className="h-48 bg-slate-700 relative">
                  {trabajo.url_foto ? (
                    <img 
                      src={trabajo.url_foto} 
                      className="w-full h-full object-cover opacity-60" 
                      onClick={() => window.open(trabajo.url_foto, '_blank')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 italic text-xs uppercase font-bold">Sin Captura</div>
                  )}
                  
                  {/* Badge de Medida Flotante */}
                  <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full shadow-xl">
                    <p className="text-[12px] font-black text-slate-900 italic">{trabajo.ancho} x {trabajo.alto} m</p>
                  </div>
                </div>

                {/* Datos del Trabajo */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[70%]">
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{trabajo.servicio}</p>
                      <h3 className="text-white font-bold text-lg leading-tight truncate">{trabajo.nombre_cliente}</h3>
                      <p className="text-slate-400 text-xs mt-1 font-medium">{trabajo.detalle || 'Sin observaciones'}</p>
                    </div>
                    <div className="bg-slate-900 px-3 py-2 rounded-2xl border border-slate-700 text-center">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Cant.</p>
                      <p className="text-lg font-black text-white">x{trabajo.cantidad}</p>
                    </div>
                  </div>

              {/* Botones de Estado para el Trabajador */}
    <div className="flex gap-2 mt-4">
      {trabajo.estado === 'Para Imprimir' ? (
        <button 
          onClick={() => cambiarEstadoPedido(trabajo.id, 'Imprimiendo')}
          className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
        >
          ⏺ Iniciar Impresión
        </button>
      ) : (
        <button 
          onClick={() => { 
            if(confirm(`¿Confirmas que la impresión de "${trabajo.nombre_cliente}" está lista?`)) { 
              cambiarEstadoPedido(trabajo.id, 'Finalizado') 
            } 
          }}
          className="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex flex-col items-center justify-center leading-none"
        >
          <span className="text-[9px] opacity-70 mb-1">EN MÁQUINA...</span>
          <span>✅ Terminar Trabajo</span>
        </button>
      )}
      
      {/* Botón para ver foto completa */}
      {trabajo.url_foto && (
        <button 
          onClick={() => window.open(trabajo.url_foto, '_blank')}
          className="w-14 h-14 bg-slate-700 text-white rounded-2xl flex items-center justify-center text-xl hover:bg-slate-600 transition-colors"
        >
          🖼️
        </button>
      )}
    </div>
                </div>
              </div>
            ))}

          {/* Mensaje si no hay nada para imprimir */}
          {listaPedidosTaller.filter(p => p.estado === 'Para Imprimir' || p.estado === 'Imprimiendo').length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-600 font-black uppercase tracking-[4px] text-sm">Todo al día</p>
              <p className="text-slate-800 text-4xl mt-2 italic">☕</p>
            </div>
          )}
        </div>
      </section>
    )}
    {/* ========================================== */}
{/* --- PESTAÑA DESPACHO (ENTREGAS Y COBROS) --- */}
{/* ========================================== */}
{pestaña === 'reportes' && (
  <section className="animate-in fade-in duration-500 p-4 pb-32 bg-[#F8FAFC] min-h-screen">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Paquetes Listos</h2>
      <div className="flex items-center gap-2 mt-1">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Control de Salida y Saldos</p>
      </div>
    </div>

    <div className="space-y-4">
      {Object.values(
        listaPedidosTaller
          .filter(p => p.estado === 'Finalizado')
          .reduce((acc: any, pedido: any) => {
            if (!acc[pedido.nombre_cliente]) {
              const ventaOriginal = listaVentas.find(v => v.nombre_cliente === pedido.nombre_cliente);
              acc[pedido.nombre_cliente] = { 
                nombre: pedido.nombre_cliente,
                trabajosTaller: [], 
                totalVenta: ventaOriginal?.pedido_total || 0,
                adelanto: ventaOriginal?.cuenta || 0,
                saldo: ventaOriginal?.saldo || 0,
                desglosePrecios: ventaOriginal?.detalle_precios || []
              };
            }
            acc[pedido.nombre_cliente].trabajosTaller.push(pedido);
            return acc;
          }, {})
      ).map((grupo: any, idx: number) => {
        const saldoPendiente = grupo.saldo;
        const estaPagado = saldoPendiente <= 0;

        // Contamos cuántos de este grupo específico están seleccionados
        const idsDelGrupo = grupo.trabajosTaller.map((t: any) => t.id);
        const seleccionadosDeEsteGrupo = pedidosSeleccionados.filter(id => idsDelGrupo.includes(id)).length;

        return (
          <div key={idx} className="bg-white rounded-[35px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
            
            {/* CABECERA: CLIENTE Y FOTOS */}
            <div className="p-5 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase leading-none">{grupo.nombre}</h3>
                  <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-widest">Contenido del Paquete:</p>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase">
                  {grupo.trabajosTaller.length} piezas
                </div>
              </div>

              {/* TIRA DE IMÁGENES */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {grupo.trabajosTaller.map((t: any) => (
                  <div key={t.id} className={`relative flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all ${pedidosSeleccionados.includes(t.id) ? 'border-blue-600 scale-95' : 'border-slate-200 opacity-60'}`}>
                    {t.url_foto ? (
                      <img src={t.url_foto} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[20px] bg-slate-50">🖼️</div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 font-bold">
                      {t.ancho}x{t.alto}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- SECCIÓN COSTO DETALLADO CON PRECIOS REALES --- */}
<div className="px-4 py-3 bg-slate-50 space-y-2 border-t border-slate-100">
  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items en este paquete:</p>
  
  {grupo.trabajosTaller.map((trabajo: any) => {
    const isSelected = pedidosSeleccionados.includes(trabajo.id);
    
    // BUSCAMOS EL PRECIO: 
    // Si 'trabajo.precio_total' es 0, buscamos en el desglose de la venta por nombre de servicio
    const precioReferencia = trabajo.precio_total > 0 
      ? trabajo.precio_total 
      : grupo.desglosePrecios.find((d: any) => d.servicio === trabajo.servicio)?.subtotal || 0;

    return (
      <div 
        key={trabajo.id} 
        onClick={() => {
          if (isSelected) setPedidosSeleccionados(prev => prev.filter(id => id !== trabajo.id));
          else setPedidosSeleccionados(prev => [...prev, trabajo.id]);
        }}
        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
          isSelected ? 'bg-white border-blue-500 shadow-sm scale-[1.02]' : 'bg-transparent border-slate-200 opacity-70'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* EL CHECKBOX VISIBLE */}
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
          }`}>
            {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
          </div>
          
          <div>
            <span className={`text-[11px] font-black uppercase block ${isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
              {trabajo.servicio}
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">
              {trabajo.ancho}x{trabajo.alto}m • Cant: {trabajo.cantidad}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={`font-black text-[12px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
            {precioReferencia} Bs.
          </span>
        </div>
      </div>
    );
  })}
</div>

            {/* RESUMEN FINANCIERO */}
            <div className="p-5 bg-white border-t border-slate-50">
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-slate-50 p-2 rounded-2xl">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-xs font-black text-slate-800">{grupo.totalVenta} Bs.</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-2xl">
                  <p className="text-[8px] font-bold text-blue-400 uppercase">Adelanto</p>
                  <p className="text-xs font-black text-blue-600">{grupo.adelanto} Bs.</p>
                </div>
                <div className={`p-2 rounded-2xl border ${estaPagado ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[8px] font-bold uppercase ${estaPagado ? 'text-emerald-400' : 'text-red-400'}`}>Saldo</p>
                  <p className={`text-xs font-black ${estaPagado ? 'text-emerald-600' : 'text-red-600'}`}>
                    {estaPagado ? 'PAGADO' : `${saldoPendiente} Bs.`}
                  </p>
                </div>
              </div>

              {/* ACCIÓN FINAL DINÁMICA */}
              <button 
                disabled={seleccionadosDeEsteGrupo === 0}
                onClick={() => entregarPedidoFinalv2(grupo.nombre)}
                className={`w-full h-14 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all ${
                  seleccionadosDeEsteGrupo === 0
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : estaPagado 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'bg-red-600 text-white shadow-lg animate-pulse'
                }`}
              >
                {seleccionadosDeEsteGrupo === 0 
                  ? 'Selecciona items arriba' 
                  : estaPagado 
                    ? `📦 Entregar ${seleccionadosDeEsteGrupo} Piezas` 
                    : `💰 Cobrar ${saldoPendiente} Bs y Entregar`}
              </button>
            </div>
          </div>
        );
      })}

      {/* Mensaje de vacío */}
      {listaPedidosTaller.filter(p => p.estado === 'Finalizado').length === 0 && (
        <div className="py-24 text-center">
          <p className="text-slate-300 font-black uppercase tracking-[5px] text-xs">Nada pendiente</p>
        </div>
      )}
    </div>
  </section>
)}
      {/* NAVEGACIÓN INFERIOR */}
        <nav className="fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-gray-200 h-20 rounded-3xl flex justify-around items-center shadow-2xl z-50">
          <button onClick={() => { setPestaña('inicio'); setAccionInicio('menu'); }} className={`flex flex-col items-center p-3 transition-all ${pestaña === 'inicio' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
            <span className="text-2xl font-bold italic">🏠</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">Inicio</span>
          </button>
          <button onClick={() => setPestaña('pedidos')} className={`flex flex-col items-center p-3 transition-all ${pestaña === 'pedidos' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
            <span className="text-2xl font-bold italic">📋</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">Pedidos</span>
          </button>
          <button onClick={() => setPestaña('taller')} className={`flex flex-col items-center p-3 transition-all ${pestaña === 'taller' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
            <span className="text-2xl font-bold italic">🖨️</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">Taller</span>
          </button>
          {/* --- ESTE ES EL BOTÓN QUE CAMBIAMOS --- */}
          <button onClick={() => setPestaña('reportes')} className={`flex flex-col items-center p-3 transition-all ${pestaña === 'reportes' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
            <span className="text-2xl font-bold italic">📦</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">Entregas</span>
          </button>
        </nav>

        {/* --- AQUÍ ESTABA EL ERROR: FALTABA PEGAR ESTO --- */}
        {modalSubida.abierto && (
          <div 
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onPaste={manejarPegadoEnModal}
          >
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Subir Diseño</h3>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Pedido ID: #{modalSubida.pedidoId}</p>
                </div>
                <button 
                  onClick={() => { setModalSubida({abierto: false, pedidoId: null}); setPrevisualizacion(null); setArchivoSeleccionado(null); }} 
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors font-bold"
                >✕</button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-3xl h-72 flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative">
                {previsualizacion ? (
                  <img src={previsualizacion} alt="Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4 text-4xl">🖼️</div>
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-[2px] mb-2">
                      Presiona <span className="text-blue-600 font-bold">CTRL + V</span>
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">Pega la captura aquí o usa el botón de abajo</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <input 
                  type="file" accept="image/*" className="hidden" id="file-upload-modal"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { 
                      setArchivoSeleccionado(file); 
                      setPrevisualizacion(URL.createObjectURL(file)); 
                    }
                  }} 
                />
                <button 
                  onClick={() => document.getElementById('file-upload-modal')?.click()}
                  className="flex-1 h-16 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200"
                >
                  {previsualizacion ? 'Cambiar' : '📁 Archivo'}
                </button>
                {archivoSeleccionado && (
                  <button 
                    disabled={subiendo}
                    onClick={() => modalSubida.pedidoId && subirACloudinary(archivoSeleccionado, modalSubida.pedidoId)}
                    className={`flex-[2] h-16 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                      subiendo ? 'bg-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {subiendo ? 'Subiendo...' : '🚀 Confirmar Subida'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
{/* ========================================== */}
{/* --- MODAL DASHBOARD DE ANÁLISIS REAL --- */}
{/* ========================================== */}
{mostrarDashboard && (
  <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="bg-[#F8FAFC] w-full max-w-3xl h-[95vh] sm:h-[90vh] sm:rounded-[40px] rounded-t-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col">
      
      {/* HEADER */}
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Balance Financiero</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis Mensual Sugerido</p>
        </div>
        <button 
          onClick={() => setMostrarDashboard(false)}
          className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >✕</button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
        
        {(() => {
          // --- LÓGICA CON TIPADO PARA TYPESCRIPT ---
          const hoy = new Date();
          const mesActual = hoy.getUTCMonth(); 
          const anioActual = hoy.getUTCFullYear();

          // 1. Filtrar Ventas (Caja Real)
          const ventasDelMes = listaVentas.filter((v: any) => {
            const f = new Date(v.fecha);
            return f.getUTCMonth() === mesActual && f.getUTCFullYear() === anioActual;
          });

          // 2. Filtrar Gastos (Blindado)
          const gastosDelMes = listaGastos.filter((g: any) => {
            const f = new Date(g.fecha);
            return f.getUTCMonth() === mesActual && f.getUTCFullYear() === anioActual;
          });

          const ingresosTotales = ventasDelMes.reduce((acc: number, v: any) => acc + (Number(v.pedido_total) || 0), 0);
          const cobradoReal = ventasDelMes.reduce((acc: number, v: any) => acc + (Number(v.cuenta) || 0), 0);
          
          const totalGastos = gastosDelMes.reduce((acc: number, g: any) => {
            const valor = typeof g.monto === 'string' ? parseFloat(g.monto) : Number(g.monto);
            return acc + (valor || 0);
          }, 0);

          const utilidad = cobradoReal - totalGastos;
          const porcentajeGasto = cobradoReal > 0 ? Math.round((totalGastos / cobradoReal) * 100) : 0;

          return (
            <>
              {/* INDICADOR DE MES */}
              <div className="mb-4 flex items-center gap-2">
                <span className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-md shadow-blue-200">
                   📍 {hoy.toLocaleString('es-ES', { month: 'long' }).toUpperCase()} {anioActual}
                </span>
              </div>

              {/* TARJETAS DE RESULTADOS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-white p-4 rounded-[25px] border border-slate-100 text-center shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Ventas Brutas</p>
                  <p className="text-lg font-black text-slate-800">{ingresosTotales.toLocaleString()} Bs.</p>
                </div>
                <div className="bg-emerald-500 p-4 rounded-[25px] text-white text-center shadow-lg shadow-emerald-100">
                  <p className="text-[8px] font-black opacity-80 uppercase mb-1">Caja Real</p>
                  <p className="text-lg font-black">{cobradoReal.toLocaleString()} Bs.</p>
                </div>
                <div className="bg-rose-500 p-4 rounded-[25px] text-white text-center shadow-lg shadow-rose-100">
                  <p className="text-[8px] font-black opacity-80 uppercase mb-1">Egresos</p>
                  <p className="text-lg font-black">{totalGastos.toLocaleString()} Bs.</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-[25px] text-white text-center">
                  <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Ganancia</p>
                  <p className="text-lg font-black text-emerald-400">{utilidad.toLocaleString()} Bs.</p>
                </div>
              </div>

              {/* GRÁFICOS DINÁMICOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Top Servicios (Mes)</h3>
                  <div className="space-y-5">
                    {Array.from(new Set(ventasDelMes.flatMap((v: any) => v.detalle_precios?.map((d: any) => d.servicio) || []))).slice(0, 4).map((servicio: any, i: number) => {
                      const totalServicio = ventasDelMes.reduce((acc: number, v: any) => {
                        const item = v.detalle_precios?.find((d: any) => d.servicio === servicio);
                        return acc + (item ? Number(item.subtotal) : 0);
                      }, 0);
                      const porc = Math.min(Math.round((totalServicio / (ingresosTotales || 1)) * 100), 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                            <span className="text-slate-500">{servicio}</span>
                            <span className="text-blue-600">{porc}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${porc}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[35px] text-white flex flex-col justify-center relative overflow-hidden shadow-xl">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 z-10">Balance de Capital</h3>
                  <div className="flex items-end gap-4 h-24 mb-4 z-10">
                    <div className="flex-1 bg-emerald-500/20 border border-emerald-500/30 rounded-t-xl h-full flex items-center justify-center">
                        <span className="text-[8px] rotate-90 font-black opacity-50">ENTRADAS</span>
                    </div>
                    <div className="flex-1 bg-rose-500 rounded-t-xl transition-all duration-1000" style={{ height: `${Math.min(porcentajeGasto, 100)}%` }}>
                    </div>
                  </div>
                  <div className="flex justify-between items-center z-10">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       {utilidad > 0 ? '✅ Operativo' : '❌ Déficit'}
                    </p>
                    <p className="text-[9px] font-bold text-rose-400 uppercase">
                      {porcentajeGasto}% Gastado
                    </p>
                  </div>
                </div>
              </div>

              {/* TABLA DE AUDITORÍA DE GASTOS */}
              <div className="bg-white rounded-[30px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-50 bg-rose-50/20 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Registros de Gastos: {hoy.toLocaleString('es-ES', { month: 'short' })}</h3>
                </div>
                <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto">
                  {gastosDelMes.length > 0 ? (
                    gastosDelMes.map((g: any, i: number) => (
                      <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700 uppercase leading-none mb-1">{g.categoria}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[180px]">{g.descripcion || 'Sin detalle'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">-{Number(g.monto).toLocaleString()} Bs.</p>
                          <p className="text-[7px] text-slate-300 font-bold">{new Date(g.fecha).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-[10px] text-slate-400 italic font-bold">Sin movimientos detectados este mes.</p>
                      <p className="text-[8px] text-slate-300 mt-2">Total histórico: {listaGastos.length} gastos</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        <button className="w-full mt-6 h-16 bg-blue-600 rounded-[25px] font-black text-xs text-white uppercase tracking-[4px] shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
          📥 Generar Informe PDF
        </button>
      </div>
    </div>
  </div>
)}
      </main>
    );
    }