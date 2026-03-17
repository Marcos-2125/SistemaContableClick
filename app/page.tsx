'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList, LineChart, Line
} from 'recharts';

// 1. MOVER ESTO FUERA PARA EVITAR ERRORES DE RENDERIZADO
const getBoliviaISO = () => {
  const ahora = new Date();
  const boliviaTime = ahora.toLocaleString("en-US", {
    timeZone: "America/La_Paz",
    hour12: false
  });
  const d = new Date(boliviaTime);
  const pad = (n: number | string) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const COLORS_DASHBOARD = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Home() {
  
// --- NAVEGACIÓN ---
const [pestaña, setPestaña] = useState('inicio');
const [accionInicio, setAccionInicio] = useState('menu');

const [verTipoAuditoria, setVerTipoAuditoria] = useState('gastos'); // 'gastos' o 'ingresos'
// <<< NUEVOS ESTADOS PARA EL FILTRO DE MES Y AÑO >>>
  // Inicializamos con el mes y año actual de Bolivia
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth()); 
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());

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
// --- NUEVOS ESTADOS PARA BÚSQUEDA Y FILTROS DE CLIENTES ---
const [busquedaCliente, setBusquedaCliente] = useState('');
const [filtroTipo, setFiltroTipo] = useState('TODOS');

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
const obtenerDatosVentasSemanales = () => {
    const ventasMap: { [key: string]: number } = {};
    const diasEnMes = new Date(anioFiltro, mesFiltro + 1, 0).getDate();

    for (let i = 1; i <= diasEnMes; i++) {
        const diaLabel = String(i).padStart(2, '0');
        ventasMap[diaLabel] = 0;
    }

    const mesPad = String(mesFiltro + 1).padStart(2, '0');
    const patronFiltro = `${anioFiltro}-${mesPad}`;
    
    // VALIDACIÓN CLAVE: Si listaVentas no existe, devolvemos el mapa vacío
    if (!listaVentas || !Array.isArray(listaVentas)) {
         return Object.entries(ventasMap).map(([name, total]) => ({ name, total }));
    }

    listaVentas.forEach((v: any) => {
        if (v && v.fecha && String(v.fecha).includes(patronFiltro)) {
            const diaV = new Date(v.fecha).getUTCDate(); 
            const diaLabel = String(diaV).padStart(2, '0');
            if (ventasMap.hasOwnProperty(diaLabel)) {
                ventasMap[diaLabel] += (Number(v.cuenta) || 0);
            }
        }
    });

    return Object.entries(ventasMap)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => Number(a.name) - Number(b.name));
};
const obtenerDatosServiciosPopulares = () => {
  const conteo: { [key: string]: number } = {};
  const mesPad = String(mesFiltro + 1).padStart(2, '0');
  const patronFiltro = `${anioFiltro}-${mesPad}`;

  const ventasDelMes = listaVentas.filter((v: any) => 
    v.fecha && String(v.fecha).includes(patronFiltro)
  );

  let totalItemsMes = 0;

  ventasDelMes.forEach((v: any) => {
    if (v.detalle_precios && Array.isArray(v.detalle_precios)) {
      v.detalle_precios.forEach((item: any) => {
        const nombre = item.servicio ? item.servicio.split(' ')[0] : "S/N";
        const cant = (Number(item.cantidad) || 1);
        conteo[nombre] = (conteo[nombre] || 0) + cant;
        totalItemsMes += cant;
      });
    }
  });

  return Object.entries(conteo).map(([name, value]) => ({
    name,
    value,
    porcentaje: totalItemsMes > 0 ? ((value / totalItemsMes) * 100).toFixed(0) : 0
  })).sort((a, b) => b.value - a.value).slice(0, 5);
};

const COLORS_DASHBOARD = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const obtenerResumenFinanciero = () => {
    const mesPad = String(mesFiltro + 1).padStart(2, '0');
    const patronFiltro = `${anioFiltro}-${mesPad}`;

    // Protección contra arrays nulos
    const ventasDelMes = (listaVentas || []).filter(v => 
        v && v.fecha && String(v.fecha).includes(patronFiltro)
    );

    const gastosDelMes = (listaGastos || []).filter(g => 
        g && g.fecha && String(g.fecha).includes(patronFiltro)
    );

    return {
        ventasTotales: ventasDelMes.reduce((acc, v) => acc + (Number(v.pedido_total) || 0), 0),
        ingresosTotales: ventasDelMes.reduce((acc, v) => acc + (Number(v.cuenta) || 0), 0),
        saldosPendientes: ventasDelMes.reduce((acc, v) => acc + (Number(v.saldo) || 0), 0),
        egresosTotales: gastosDelMes.reduce((acc, g) => acc + (Number(g.monto) || 0), 0)
    };
};

const obtenerDatosVS = () => {
  const conteo: { [key: string]: number } = {
    DECORADORA: 0,
    EMPRESA: 0,
    REGULAR: 0
  };

  const mesPad = String(mesFiltro + 1).padStart(2, '0');
  const patronFiltro = `${anioFiltro}-${mesPad}`;

  const ventasDelMes = listaVentas.filter((v: any) => 
    v.fecha && String(v.fecha).includes(patronFiltro)
  );

  ventasDelMes.forEach((v: any) => {
    const clienteEncontrado = listaClientes.find(
      (c: any) => c.Nombre?.trim().toUpperCase() === v.nombre_cliente?.trim().toUpperCase()
    );
    const tipo = (clienteEncontrado?.Tipo?.toUpperCase() || 'REGULAR') as string; 
    
    if (conteo.hasOwnProperty(tipo)) {
      conteo[tipo] += (Number(v.pedido_total) || 0);
    } else {
      conteo['REGULAR'] += (Number(v.pedido_total) || 0);
    }
  });

  return Object.entries(conteo).map(([name, total]) => ({
    name,
    total
  }));
};
// ==========================================
  // --- CARGA Y REFRESCO DE DATOS ---
  // ==========================================

  const refrescarTotalesHoy = async () => {
    try {
      const fechaBolivia = getBoliviaISO().split('T')[0];
      const isoInicio = `${fechaBolivia}T00:00:00`;
      const isoFin = `${fechaBolivia}T23:59:59`;

      // Gastos de hoy
      const { data: dataGastos } = await supabase
        .from('gastos')
        .select('monto')
        .gte('fecha', isoInicio)
        .lte('fecha', isoFin);
      
      const totalG = dataGastos?.reduce((acc, g) => acc + (Number(g.monto) || 0), 0) || 0;
      setTotalGastosHoy(totalG);

      // Ingresos de hoy (Cuentas/Acuenta de ventas hoy)
      const { data: dataVentas } = await supabase
        .from('registro_ventas')
        .select('cuenta, pedido_total, estado')
        .gte('fecha', isoInicio)
        .lte('fecha', isoFin);

      const totalI = dataVentas?.reduce((acc, v) => {
        // Si el estado es Pendiente, sumamos solo lo que dejó 'a cuenta' (columna cuenta)
        // Si ya está Entregado/Finalizado, sumamos el total del pedido
        return v.estado === 'Pendiente' 
          ? acc + (Number(v.cuenta) || 0) 
          : acc + (Number(v.pedido_total) || 0);
      }, 0) || 0;
      
      setTotalIngresosHoy(totalI);
    } catch (error) {
      console.error("Error refrescando totales:", error);
    }
  };

  const cargarDatosVentas = async () => {
    const anioActual = new Date().getFullYear();
    const { data, error } = await supabase
      .from('registro_ventas')
      .select('*')
      .gte('fecha', `${anioActual}-01-01`)
      .order('fecha', { ascending: false });
    if (data) setListaVentas(data);
  };

  const cargarHistorialGastos = async () => {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });
    if (data) {
      setListaGastos(data.map(g => ({
        ...g,
        monto: Number(g.monto) || 0,
        fecha: g.fecha
      })));
    }
  };

  const cargarPedidosTaller = async () => {
    const { data } = await supabase
      .from('pedidos_activos')
      .select('*')
      .order('id', { ascending: true });
    if (data) setListaPedidosTaller(data);
  };

  useEffect(() => {
    async function descargarDatosIniciales() {
      try {
        const { data: dataServ } = await supabase.from('Servicios').select('Nombre').order('Nombre', { ascending: true });
        if (dataServ) setListaServicios(dataServ.map(s => s.Nombre));

        const { data: dataClie } = await supabase.from('Clientes').select('*').order('Nombre', { ascending: true });
        if (dataClie) setListaClientes(dataClie);

        const { data: dataCats } = await supabase.from('categorias_gastos').select('*').order('nombre', { ascending: true });
        if (dataCats) setMisCategorias(dataCats);

        await refrescarTotalesHoy();
        await cargarDatosVentas();
      } catch (error) {
        console.error("Error carga inicial:", error);
      }
    }
    descargarDatosIniciales();
  }, []);

  useEffect(() => {
    setPedidosSeleccionados([]);
    if (pestaña === 'pedidos' || pestaña === 'taller' || pestaña === 'reportes' || mostrarDashboard === true) {
      cargarPedidosTaller();
      cargarDatosVentas();
      cargarHistorialGastos();
    }
  }, [pestaña, mostrarDashboard]);

  // ==========================================
  // --- GESTIÓN DE GASTOS Y CATEGORÍAS ---
  // ==========================================

  const guardarCategoriaBD = async () => {
    if (nuevaCatNombre.trim() === "") return alert("Escribe el nombre de la categoría");
    const { data, error } = await supabase
      .from('categorias_gastos')
      .insert([{ 
        nombre: nuevaCatNombre.toUpperCase(), 
        icono: nuevaCatIcono 
      }])
      .select();
    
    if (!error && data) {
      setMisCategorias([...misCategorias, data[0]]);
      setNuevaCatNombre('');
      setNuevaCatIcono('💸');
      alert("Categoría guardada");
    }
  };

  const eliminarCategoria = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar esta categoría?")) {
      const { error } = await supabase.from('categorias_gastos').delete().eq('id', id);
      if (!error) setMisCategorias(misCategorias.filter(c => c.id !== id));
    }
  };

  const guardarGastoRealBD = async () => {
    if (!gastoMonto || Number(gastoMonto) <= 0) return alert("Monto inválido");
    if (!gastoCategoria) return alert("Selecciona una categoría");

    const { error } = await supabase.from('gastos').insert([{
      categoria: gastoCategoria,
      monto: Number(gastoMonto),
      descripcion: gastoDetalle.toUpperCase().trim(),
      fecha: getBoliviaISO()
    }]);

    if (!error) {
      await refrescarTotalesHoy();
      alert("Gasto registrado");
      setGastoMonto('');
      setGastoDetalle('');
      setGastoCategoria('');
      setAccionInicio('menu');
    } else {
      alert("Error al guardar: " + error.message);
    }
  };
// ==========================================
  // --- GESTIÓN DE CLIENTES ---
  // ==========================================

  const guardarClienteBD = async () => {
    if (nombreClienteInput.trim() === "") return alert("El nombre es obligatorio");
    const { data, error } = await supabase
      .from('Clientes')
      .insert([{ 
        Nombre: nombreClienteInput.toUpperCase().trim(), 
        Telefono: telClienteInput, 
        Tipo: tipoClienteInput 
      }])
      .select();
    
    if (!error && data) {
      setListaClientes([...listaClientes, data[0]]);
      setNombreClienteInput('');
      setTelClienteInput('');
      setTipoClienteInput('Regular');
      alert("Cliente guardado correctamente");
    }
  };

  const eliminarCliente = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar al cliente ${nombre}?`)) {
      const { error } = await supabase.from('Clientes').delete().eq('id', id);
      if (!error) setListaClientes(listaClientes.filter(c => c.id !== id));
    }
  };
  const actualizarNotaCliente = async (id: number, columna: string, texto: string) => {
  const { error } = await supabase
    .from('Clientes')
    .update({ [columna]: texto }) 
    .eq('id', id);

  if (!error) {
    // Actualiza la lista local para que el cambio sea instantáneo en pantalla
    setListaClientes(prev => prev.map(c => c.id === id ? { ...c, [columna]: texto } : c));
  } else {
    console.error("Error al guardar nota:", error.message);
  }
};

  // ==========================================
  // --- LÓGICA DE PROCESAMIENTO DE PEDIDOS ---
  // ==========================================

  const finalizarPedido = async () => {
    if (trabajos.length === 0) return alert("Debes agregar al menos un trabajo");
    if (!nombreClienteInput) return alert("Nombre de cliente obligatorio");

    try {
      const idPedidoActual = Date.now();
      const fechaFijaBolivia = getBoliviaISO();
      const nombreLimpio = nombreClienteInput.toUpperCase().trim();

      // --- [NUEVO: REGISTRO AUTOMÁTICO DE CLIENTE] ---
      // 1. Verificamos si el cliente existe en la tabla 'Clientes'
      const { data: clienteExistente } = await supabase
        .from('Clientes')
        .select('*')
        .eq('Nombre', nombreLimpio)
        .maybeSingle();

      // 2. Si NO existe, lo creamos como 'Regular' automáticamente
      if (!clienteExistente) {
        console.log("Cliente nuevo detectado, registrando como Regular...");
        const { error: errorAutoRegistro } = await supabase
          .from('Clientes')
          .insert([{ 
            Nombre: nombreLimpio, 
            Telefono: telClienteInput, 
            Tipo: 'Regular' // <--- Esto asegura que aparezca en tus gráficos
          }]);
        
        if (errorAutoRegistro) {
          console.error("Error en auto-registro:", errorAutoRegistro);
        } else {
          // Actualizamos la lista local de clientes para que el Dashboard lo vea
          const { data: dataClie } = await supabase.from('Clientes').select('*').order('Nombre', { ascending: true });
          if (dataClie) setListaClientes(dataClie);
        }
      }
      // --- [FIN DEL NUEVO BLOQUE] ---

      // Calculamos el total de este nuevo pedido
      const totalNuevoTrabajo = trabajos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
      
      const desglosePreciosNuevos = trabajos.map(t => ({
        servicio: t.servicio.toUpperCase().trim(),
        cantidad: Number(t.cant),
        subtotal: Number(t.precio)
      }));

      const resumenDetalleNuevo = trabajos.map(t => 
        `${t.cant} ${t.servicio.toUpperCase()} (${t.ancho}x${t.alto})`
      ).join(" // ");

      // 1. INSERTAR EN TALLER (pedidos_activos)
      const { error: errorTaller } = await supabase.from('pedidos_activos').insert(
        trabajos.map(t => ({
          id_pedido: idPedidoActual,
          nombre_cliente: nombreLimpio,
          servicio: t.servicio,
          ancho: t.ancho,
          alto: t.alto,
          cantidad: Number(t.cant),
          detalle: t.detalle || '',
          precio_unitario: Number(t.precio), 
          estado: 'Pendiente',
          fecha: fechaFijaBolivia
        }))
      );
      if (errorTaller) throw errorTaller;

      // 2. GESTIÓN EN REGISTRO_VENTAS
      const { data: pedidoExistente } = await supabase
        .from('registro_ventas')
        .select('*')
        .eq('nombre_cliente', nombreLimpio)
        .eq('estado', 'Pendiente')
        .maybeSingle();

      if (pedidoExistente) {
        const nuevoTotalGlobal = (Number(pedidoExistente.pedido_total) || 0) + totalNuevoTrabajo;
        const nuevaCuentaGlobal = (Number(pedidoExistente.cuenta) || 0) + (Number(montoAcuenta) || 0);
        
        const { error: errorUpdate } = await supabase
          .from('registro_ventas')
          .update({
            detalle_servicio: pedidoExistente.detalle_servicio + " // " + resumenDetalleNuevo,
            detalle_precios: [
              ...(Array.isArray(pedidoExistente.detalle_precios) ? pedidoExistente.detalle_precios : []), 
              ...desglosePreciosNuevos
            ],
            pedido_total: nuevoTotalGlobal,
            cuenta: nuevaCuentaGlobal,
            saldo: Math.max(0, nuevoTotalGlobal - nuevaCuentaGlobal),
            fecha: fechaFijaBolivia 
          })
          .eq('id_pedido', pedidoExistente.id_pedido);
        
        if (errorUpdate) throw errorUpdate;
      } else {
        const { error: errorVenta } = await supabase.from('registro_ventas').insert([{
          id_pedido: idPedidoActual,
          nombre_cliente: nombreLimpio,
          telefono_cliente: telClienteInput,
          detalle_servicio: resumenDetalleNuevo,
          detalle_precios: desglosePreciosNuevos,
          pedido_total: totalNuevoTrabajo,
          cuenta: Number(montoAcuenta) || 0, 
          saldo: totalNuevoTrabajo - (Number(montoAcuenta) || 0),
          estado: 'Pendiente',
          fecha: fechaFijaBolivia
        }]);
        if (errorVenta) throw errorVenta;
      }

      await Promise.all([refrescarTotalesHoy(), cargarDatosVentas()]);
      alert("¡Pedido guardado y enviado a taller!");
      
      setTrabajos([]);
      setNombreClienteInput('');
      setTelClienteInput('');
      setMontoAcuenta(0);
      setAccionInicio('menu');
      
    } catch (err: any) {
      alert("Error en proceso: " + err.message);
    }
  };
// ==========================================
  // --- LÓGICA DE TALLER Y ENTREGAS ---
  // ==========================================

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
    const fechaHoy = getBoliviaISO();
    
    const ventaActual = listaVentas.find(v => v.nombre_cliente?.trim() === nombreLimpio && v.estado === 'Pendiente');
    if (!ventaActual) return alert("No hay pedidos pendientes.");

    const saldoActual = Number(ventaActual.saldo) || 0;
    
    // PREGUNTA 1: ¿Cuánto paga hoy?
    const monto = window.prompt(`CLIENTE: ${nombreLimpio}\nSALDO PENDIENTE: ${saldoActual} Bs.\n\n¿Cuánto cancela hoy?`, saldoActual.toString());
    if (monto === null) return;
    const pagoHoy = parseFloat(monto) || 0;

    // PREGUNTA 2: ¿Hay rebaja o el resto se pierde? 
    // Si lo que paga hoy es menos que el saldo, preguntamos si el resto sigue pendiente o se anula.
    let nuevoEstado = 'Pendiente';
    let nuevoTotal = Number(ventaActual.pedido_total);

    if (pagoHoy < saldoActual) {
      const respuesta = confirm("El pago es menor al saldo. ¿Deseas PERDONAR el resto (Rebaja/Anulación) para cerrar la deuda?\n\nOK = Deuda saldada (Saldo 0).\nCancelar = El resto queda como deuda pendiente.");
      if (respuesta) {
        // Ajustamos el total del pedido para que coincida con lo pagado hasta ahora
        nuevoTotal = (Number(ventaActual.cuenta) || 0) + pagoHoy;
        nuevoEstado = 'Entregado';
      }
    } else {
      nuevoEstado = 'Entregado';
    }

    const nSaldo = Math.max(0, (nuevoTotal - ((Number(ventaActual.cuenta) || 0) + pagoHoy)));

    const { error: errorVenta } = await supabase
      .from('registro_ventas')
      .update({ 
        pedido_total: nuevoTotal, // Se ajusta si hubo rebaja
        cuenta: (Number(ventaActual.cuenta) || 0) + pagoHoy,
        saldo: nSaldo,
        estado: nuevoEstado,
        fecha: fechaHoy 
      })
      .eq('id_pedido', ventaActual.id_pedido);

    if (errorVenta) throw errorVenta;

    // Archivar solo los trabajos seleccionados
    if (pedidosSeleccionados.length > 0) {
      await supabase
        .from('pedidos_activos')
        .update({ estado: 'Archivado', fecha_entrega: fechaHoy })
        .in('id', pedidosSeleccionados);
    }

    alert("🚀 Proceso completado. Datos actualizados.");
    setPedidosSeleccionados([]);
    await Promise.all([cargarDatosVentas(), cargarPedidosTaller(), refrescarTotalesHoy()]);
    
  } catch (err: any) {
    alert("Error: " + err.message);
  }
};
  // ==========================================
  // --- GESTIÓN DE SERVICIOS ---
  // ==========================================

  const guardarServicioBD = async () => {
    if (nuevoServicioInput.trim()) {
      const nom = nuevoServicioInput.toUpperCase().trim();
      const { error } = await supabase.from('Servicios').insert([{ Nombre: nom }]);
      if (!error) {
        setListaServicios([...listaServicios, nom]);
        setNuevoServicioInput('');
        alert("Servicio agregado");
      }
    }
  };

  const editarServicio = async (nombreAntiguo: string) => {
    const nuevoNombre = prompt("Nuevo nombre para el servicio:", nombreAntiguo);
    if (nuevoNombre && nuevoNombre.trim() !== "") {
      const { error } = await supabase
        .from('Servicios')
        .update({ Nombre: nuevoNombre.toUpperCase().trim() })
        .eq('Nombre', nombreAntiguo);
      
      if (!error) {
        setListaServicios(listaServicios.map(s => s === nombreAntiguo ? nuevoNombre.toUpperCase().trim() : s));
      }
    }
  };

  const eliminarServicio = async (nombre: string) => {
    if (confirm(`¿Eliminar el servicio "${nombre}"?`)) {
      const { error } = await supabase.from('Servicios').delete().eq('Nombre', nombre);
      if (!error) setListaServicios(listaServicios.filter(s => s !== nombre));
    }
  };

  // ==========================================
  // --- CLOUDINARY Y MANEJO DE IMÁGENES ---
  // ==========================================

  const subirACloudinary = async (file: File, pedidoId: number) => {
    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'fotos_pedidos'); // Tu preset configurado

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/debs3gk6x/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        const { error } = await supabase
          .from('pedidos_activos')
          .update({ url_foto: data.secure_url })
          .eq('id', pedidoId);

        if (!error) {
          alert("¡Foto guardada exitosamente!");
          setModalSubida({ abierto: false, pedidoId: null });
          setPrevisualizacion(null);
          setArchivoSeleccionado(null);
          cargarPedidosTaller();
        }
      }
    } catch (err) {
      alert("Error al subir imagen a Cloudinary");
    } finally {
      setSubiendo(false);
    }
  };

  const manejarPegadoEnModal = (e: any) => {
    if (!modalSubida.abierto) return;
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
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
  // --- [NUEVA FUNCIÓN] ENTREGA PARA CLIENTES SIN SALDO (COMO MARCOS) ---
  const entregarSoloTrabajos = async (nombreCliente: string) => {
    try {
      const nombreLimpio = nombreCliente.trim();
      const fechaHoy = getBoliviaISO();

      // Filtramos los trabajos que están en 'Finalizado' para archivarlos
      const trabajosAEntregar = listaPedidosTaller.filter(p => 
        p.nombre_cliente?.toUpperCase().trim() === nombreLimpio.toUpperCase().trim() && 
        p.estado === 'Finalizado'
      );

      if (trabajosAEntregar.length === 0) {
        alert("No hay trabajos listos para entregar de este cliente.");
        return;
      }

      // Actualizamos a 'Archivado' en la base de datos
      for (const trabajo of trabajosAEntregar) {
        const { error } = await supabase
          .from('pedidos_activos') // IMPORTANTE: Usamos tu tabla 'pedidos_activos'
          .update({ 
            estado: 'Archivado',
            fecha_entrega: fechaHoy 
          })
          .eq('id', trabajo.id);

        if (error) throw error;
      }

      alert("✅ ¡Entrega confirmada! Los trabajos se han entregado y archivado.");
      
      // Refrescamos los datos para que desaparezca de la lista
      await Promise.all([cargarPedidosTaller(), cargarDatosVentas()]);

    } catch (error) {
      console.error("Error al entregar:", error);
      alert("❌ Hubo un error al procesar la entrega.");
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

    {/* Formulario para añadir */}
    <div className="space-y-3 mb-6">
      <input 
        placeholder="Material o Insumo" 
        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border outline-none" 
        value={nuevoCostoInput.item} 
        onChange={(e) => setNuevoCostoInput({ ...nuevoCostoInput, item: e.target.value })} 
      />
      <div className="flex gap-2">
        <input 
          type="number" 
          placeholder="Costo Bs." 
          className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm border outline-none" 
          value={nuevoCostoInput.precio} 
          onChange={(e) => setNuevoCostoInput({ ...nuevoCostoInput, precio: e.target.value })} 
        />
        <button 
          onClick={() => {
            if (!nuevoCostoInput.item || !nuevoCostoInput.precio) return;
            // CORRECCIÓN: Convertimos el precio a Number para evitar el error 2322
            setCostosProduccion([
              ...costosProduccion, 
              { 
                item: nuevoCostoInput.item, 
                precio: Number(nuevoCostoInput.precio) 
              }
            ]);
            setNuevoCostoInput({ item: '', precio: '' });
          }} 
          className="bg-red-500 text-white px-5 rounded-xl font-bold italic active:scale-95 transition-transform"
        >
          OK
        </button>
      </div>
    </div>

    {/* Lista de costos con opción de eliminar */}
    <div className="space-y-2 italic max-h-60 overflow-y-auto pr-1">
      {costosProduccion.map((c, i) => (
        <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-xl text-xs font-bold border border-red-100">
          <div className="flex flex-col">
            <span className="text-slate-700 uppercase">{c.item}</span>
            <span className="text-red-600">{c.precio} Bs.</span>
          </div>
          
          {/* Botón para eliminar el item si te equivocas */}
          <button 
            onClick={() => {
              const nuevaLista = costosProduccion.filter((_, index) => index !== i);
              setCostosProduccion(nuevaLista);
            }}
            className="text-red-300 hover:text-red-600 p-2 transition-colors"
          >
            🗑️
          </button>
        </div>
      ))}
      
      {costosProduccion.length === 0 && (
        <p className="text-center text-gray-400 text-[10px] py-4">No hay costos configurados</p>
      )}
    </div>
  </div>
)}

          {/* VISTA: REGISTRO DE CLIENTES TOTALMENTE CORREGIDO */}
{accionInicio === 'nuevo-cliente' && (
  <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 animate-in slide-in-from-bottom max-w-2xl mx-auto">
    
    {/* CABECERA */}
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-black text-purple-600 uppercase italic">Gestión de Clientes</h2>
      <button onClick={() => setAccionInicio('menu')} className="bg-gray-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">✕</button>
    </div>
    
    {/* FORMULARIO DE REGISTRO */}
    <div className="space-y-4 mb-8 bg-purple-50/30 p-4 rounded-2xl border border-purple-100">
      <p className="text-[10px] font-black text-purple-400 uppercase ml-1">Nuevo Registro</p>
      <input 
        type="tel" 
        placeholder="Teléfono" 
        className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500 font-bold"
        value={telClienteInput}
        onChange={(e) => setTelClienteInput(e.target.value)}
      />
      <input 
        type="text" 
        placeholder="Nombre Completo" 
        className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500 font-bold uppercase"
        value={nombreClienteInput}
        onChange={(e) => setNombreClienteInput(e.target.value)}
      />

      {/* SELECTOR DE TIPO (DURANTE REGISTRO) */}
      <div className="flex gap-2 p-1 bg-white border border-gray-100 rounded-2xl">
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
        className="w-full bg-purple-600 text-white p-5 rounded-2xl font-black shadow-lg uppercase italic hover:bg-purple-700 active:scale-95 transition-all"
      >
        Registrar Cliente
      </button>
    </div>

    {/* SECCIÓN DE LISTADO, FILTROS Y COMENTARIOS */}
    <div className="border-t pt-6">
      
      {/* BUSCADOR Y TÍTULO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Base de Datos de Clientes</h3>
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="🔍 Buscar nombre o telf..." 
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-purple-400 font-bold"
          />
        </div>
      </div>

      {/* FILTRO POR TIPO (PARA LA LISTA) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['TODOS', 'REGULAR', 'EMPRESA', 'DECORADORA'].map((t) => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all whitespace-nowrap ${
              filtroTipo === t ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      
      {/* LISTA DINÁMICA DE CLIENTES CON TARJETAS DE COMENTARIOS */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
        {listaClientes
          .filter(c => {
            const coincideTipo = filtroTipo === 'TODOS' || c.Tipo?.toUpperCase() === filtroTipo;
            const coincideBusqueda = 
              c.Nombre?.toLowerCase().includes(busquedaCliente.toLowerCase()) || 
              c.Telefono?.includes(busquedaCliente);
            return coincideTipo && coincideBusqueda;
          })
          .map((c) => (
          <div key={c.id} className="bg-white border-2 border-gray-50 rounded-2xl p-4 shadow-sm hover:border-purple-100 transition-all group">
            
            {/* INFO BÁSICA Y BOTÓN ELIMINAR */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black uppercase text-gray-800">{c.Nombre}</p>
                  <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${
                    c.Tipo === 'Empresa' ? 'bg-blue-100 text-blue-600' : 
                    c.Tipo === 'Decoradora' ? 'bg-pink-100 text-pink-600' : 
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {c.Tipo || 'Regular'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-1">📱 {c.Telefono || 'Sin número registrado'}</p>
              </div>
              <button 
                onClick={() => eliminarCliente(c.id, c.Nombre)} 
                className="opacity-0 group-hover:opacity-100 text-red-200 hover:text-red-500 p-2 transition-all"
              >
                🗑️
              </button>
            </div>

            {/* PARTE DE EDICIÓN DE COMENTARIOS (PREFERENCIAS Y ALERTAS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              
              {/* Bloque Preferencias */}
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                <label className="text-[8px] font-black text-blue-500 uppercase block mb-1.5 flex items-center gap-1">
                  ⭐ Preferencias de Impresión
                </label>
                <textarea 
                  defaultValue={c.preferencias || ''}
                  onBlur={(e) => actualizarNotaCliente(c.id, 'preferencias', e.target.value)}
                  placeholder="Ej: Lona mate, ojalillos plateados..."
                  className="w-full bg-transparent border-none focus:ring-0 text-[10px] text-blue-900 placeholder-blue-300 resize-none p-0 leading-tight"
                  rows={2}
                />
              </div>

              {/* Bloque Alertas */}
              <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                <label className="text-[8px] font-black text-red-500 uppercase block mb-1.5 flex items-center gap-1">
                  ⚠️ Alertas / Notas de Pago
                </label>
                <textarea 
                  defaultValue={c.alertas || ''}
                  onBlur={(e) => actualizarNotaCliente(c.id, 'alertas', e.target.value)}
                  placeholder="Ej: Regatea mucho, no dejar salir sin saldo..."
                  className="w-full bg-transparent border-none focus:ring-0 text-[10px] text-red-900 placeholder-red-300 resize-none p-0 leading-tight"
                  rows={2}
                />
              </div>

            </div>
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
      <div className="flex justify-center gap-2 items-center">
        <p className="text-slate-400 text-[9px] font-bold tracking-tighter uppercase">Click Gestión de Inventario</p>
        {/* Etiqueta visual de categoría asignada */}
        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
          tipoClienteInput === 'DECORADORA' ? 'bg-blue-500 text-white' : 
          tipoClienteInput === 'EMPRESA' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
        }`}>
          {tipoClienteInput || 'REGULAR'}
        </span>
      </div>
      <button 
        onClick={() => { setAccionInicio('menu'); setTrabajos([]); setNombreClienteInput(''); setTelClienteInput(''); setTipoClienteInput('REGULAR'); }} 
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
                const tel = e.target.value;
                setTelClienteInput(tel);
                const encontrado = listaClientes.find(c => c.Telefono === tel);
                if (encontrado) { 
                  setNombreClienteInput(encontrado.Nombre); 
                  setTipoClienteInput(encontrado.Tipo); 
                } else {
                  // Si el teléfono no existe, asumimos que es REGULAR
                  setTipoClienteInput('REGULAR');
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
                const nom = e.target.value;
                setNombreClienteInput(nom);
                setMostrarSugerencias(true);
                
                // Si escribes un nombre que no está en la lista, es REGULAR
                const existe = listaClientes.find(c => c.Nombre.toLowerCase() === nom.toLowerCase());
                if (!existe) {
                  setTipoClienteInput('REGULAR');
                } else {
                  setTipoClienteInput(existe.Tipo);
                  setTelClienteInput(existe.Telefono);
                }

                if (nom === "") { 
                  setTelClienteInput(""); 
                  setTipoClienteInput('REGULAR');
                  setMostrarSugerencias(false); 
                }
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
                      className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b text-[10px] font-black uppercase transition-colors flex justify-between items-center"
                      onClick={() => {
                        setNombreClienteInput(c.Nombre);
                        setTelClienteInput(c.Telefono);
                        setTipoClienteInput(c.Tipo || 'REGULAR');
                        setMostrarSugerencias(false);
                      }}
                    >
                      <span>{c.Nombre}</span>
                      <span className="text-[7px] opacity-70">{c.Tipo || 'REGULAR'}</span>
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
{/* --- PESTAÑA PEDIDOS (ELEGANT MINIMALIST) --- */}
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
          .filter((p: any) => p.estado !== 'Archivado')
          .reduce((acc: any, pedido: any) => {
            if (!acc[pedido.nombre_cliente]) {
              // BUSCAMOS SOLO LAS PREFERENCIAS DEL CLIENTE
              const infoCliente = listaClientes.find(c => c.Nombre === pedido.nombre_cliente);
              
              acc[pedido.nombre_cliente] = { 
                nombre: pedido.nombre_cliente,
                telefono: infoCliente?.Telefono || '',
                tipo: infoCliente?.Tipo || 'Cliente',
                preferencias: infoCliente?.preferencias || '', // Info clave aquí
                trabajos: [],
                total: 0, espera: 0, haciendo: 0, listos: 0
              };
            }
            acc[pedido.nombre_cliente].trabajos.push(pedido);
            acc[pedido.nombre_cliente].total++;
            
            if (pedido.estado === 'Pendiente') acc[pedido.nombre_cliente].espera++;
            if (pedido.estado === 'Diseñando') acc[pedido.nombre_cliente].haciendo++;
            if (pedido.estado === 'Para Imprimir' || pedido.estado === 'Finalizado') acc[pedido.nombre_cliente].listos++;
            
            return acc;
          }, {})
      )
      .filter((grupo: any) => grupo.listos < grupo.total)
      .map((grupo: any, idx: number) => {
        const abierto = clienteAbierto === grupo.nombre;

        return (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
            
            {/* HEADER CLIENTE (Elegante y Simple) */}
            <div 
              onClick={() => setClienteAbierto(abierto ? null : grupo.nombre)}
              className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${abierto ? 'bg-slate-50/80 border-b border-slate-100' : ''}`}
            >
              <div className="flex-1 pr-4"> {/* Añadido padding derecho para separar de los contadores */}
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-slate-800 text-base">{grupo.nombre}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${
                    grupo.tipo === 'Empresa' ? 'bg-blue-100 text-blue-600' : 
                    grupo.tipo === 'Decoradora' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {grupo.tipo}
                  </span>
                </div>
                
                {/* --- SECCIÓN DE DETALLES DEL CLIENTE (TELF Y PREFERENCIAS MINI) --- */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <p className="text-xs text-slate-400 font-medium">{grupo.telefono}</p>
                  
                  {/* --- NUEVO: PREFERENCIAS MINIMALISTAS EN LA ESQUINA DEL TEXTO --- */}
                  {grupo.preferencias && (
                    <span className="inline-block mt-1 sm:mt-0 text-[10px] font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic truncate max-w-xs" title={grupo.preferencias}>
                      Pref: {grupo.preferencias}
                    </span>
                  )}
                </div>
              </div>

              {/* Contadores (Sin cambios) */}
              <div className="flex gap-3 items-center mr-4">
                {grupo.espera > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span><span className="text-[10px] font-bold text-slate-400">{grupo.espera}</span></div>}
                {grupo.haciendo > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span><span className="text-[10px] font-bold text-orange-500">{grupo.haciendo}</span></div>}
                <div className="text-[10px] font-bold text-slate-300">/</div>
                <div className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{grupo.total}</div>
              </div>
              <span className={`text-slate-300 transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
            </div>

            {/* CONTENIDO DESPLEGABLE (SOLO LISTA DE TRABAJOS, LIMPIO) */}
            {abierto && (
              <div className="p-3 space-y-2 bg-[#FCFDFF]">
                {/* LISTA DE TRABAJOS (Tu diseño original sin el bloque de avisos azul) */}
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
{/* --- PESTAÑA DESPACHO (REPORTES + ALERTAS) --- */}
{/* ========================================== */}
{pestaña === 'reportes' && (
  <section className="animate-in fade-in duration-500 p-4 pb-32 bg-[#F1F5F9] min-h-screen">
    <div className="space-y-3">
      {Object.values(
        listaVentas.reduce((acc: any, v: any) => {
          const nombre = v.nombre_cliente?.toUpperCase().trim() || "S/N";
          
          const todosLosDelClienteActual = listaPedidosTaller.filter(p => 
            p.nombre_cliente?.toUpperCase().trim() === nombre &&
            p.estado !== 'Archivado'
          );

          const fotosListas = todosLosDelClienteActual.filter(p => p.estado === 'Finalizado');
          if (fotosListas.length === 0) return acc;

          if (!acc[nombre]) {
            // BUSCAMOS LA INFO EXTENDIDA DEL CLIENTE (ALERTAS E ID)
            const infoC = listaClientes.find(c => c.Nombre?.toUpperCase().trim() === nombre);
            
            acc[nombre] = { 
              id_cliente: infoC?.id, // Necesario para el botón de editar
              nombre, 
              alertas: infoC?.alertas || '', 
              total_tabla: (Number(v.pedido_total) || 0), 
              saldo_tabla: (Number(v.saldo) || 0),
              total_pedidos: todosLosDelClienteActual.length, 
              listos_pedidos: fotosListas.length,
              trabajos: [] 
            };
          }

          const trabajosConInfo = fotosListas.map(t => ({
            ...t,
            sub: (Number(t.precio_unitario) || 0) * (Number(t.cantidad) || 1),
            medida: `${t.ancho || '?'} x ${t.alto || '?'}`,
            mat: t.material || 'Estándar'
          }));

          const idsExistentes = new Set(acc[nombre].trabajos.map((tr: any) => tr.id));
          acc[nombre].trabajos = [...acc[nombre].trabajos, ...trabajosConInfo.filter(tr => !idsExistentes.has(tr.id))];
          
          return acc;
        }, {})
      ).map((grupo: any, idx: number) => {
        const estaAbierto = clienteAbierto === grupo.nombre;
        
        return (
          <div key={idx} className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden mb-3">
            
            {/* CABECERA CLIENTE CON ALERTAS */}
            <div onClick={() => setClienteAbierto(estaAbierto ? null : grupo.nombre)} className="p-4 flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${grupo.saldo_tabla > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {grupo.nombre.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase">{grupo.nombre}</h3>
                  
                  {/* --- SECCIÓN DE ALERTAS Y COBRO --- */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {grupo.saldo_tabla > 0 ? (
                      <span className="text-[9px] font-black text-red-500 uppercase italic">Saldo: {grupo.saldo_tabla} Bs.</span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-500 uppercase">Pagado ✓</span>
                    )}

                    {/* MOSTRAR ALERTA SI EXISTE */}
                    {grupo.alertas && (
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded animate-pulse">
                         ⚠️ {grupo.alertas}
                      </span>
                    )}

                    {/* BOTÓN EDITAR ALERTA (SUTIL) */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const nAlerta = prompt("Nota/Alerta para cobro:", grupo.alertas);
                        if (nAlerta !== null) actualizarNotaCliente(grupo.id_cliente, 'alertas', nAlerta);
                      }}
                      className="text-[8px] font-black text-slate-400 border border-slate-200 px-1.5 rounded hover:bg-slate-100"
                    >
                      EDITAR NOTA
                    </button>
                  </div>
                </div>
              </div>
              <span className={`text-[8px] font-black px-2 py-1 rounded-full ${grupo.listos_pedidos === grupo.total_pedidos ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                {grupo.listos_pedidos}/{grupo.total_pedidos} LISTOS
              </span>
            </div>

            {estaAbierto && (
              <div className="p-4 border-t border-slate-50 bg-slate-50/30">
                {/* CARROUSEL DE TRABAJOS (TARJETAS 3D) */}
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                  {grupo.trabajos.map((t: any) => (
                    <div key={t.id} className="relative flex-shrink-0 w-48 h-64 perspective">
                      <div tabIndex={0} className="relative w-full h-full transition-transform duration-700 transform-style-3d group focus:rotate-y-180 active:rotate-y-180 cursor-pointer">
                        
                        {/* CARA A (Foto) */}
                        <div className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden border-2 border-white shadow-sm bg-slate-200">
                          {t.url_foto && <img src={t.url_foto} className="w-full h-full object-cover" />}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 p-3">
                            <p className="text-[10px] font-black text-white uppercase truncate">{t.servicio}</p>
                            <p className="text-[9px] text-emerald-400 font-black">{t.medida}</p>
                          </div>
                        </div>

                        {/* CARA B (Info Técnica) */}
                        <div className="absolute inset-0 backface-hidden rounded-3xl bg-slate-900 text-white p-5 rotate-y-180 flex flex-col">
                          <p className="text-[9px] font-black text-blue-400 uppercase mb-3">Detalles Técnicos</p>
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-col border-b border-slate-800 pb-1">
                              <span className="text-[8px] text-slate-500 uppercase">Medidas</span>
                              <span className="text-[11px] font-black text-emerald-400">{t.medida}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                              <span className="text-[8px] text-slate-500 uppercase">Cantidad</span>
                              <span className="text-[10px] font-black">{t.cantidad}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                              <span className="text-[8px] text-slate-500 uppercase">Subtotal</span>
                              <span className="text-[10px] font-black text-blue-400">{t.sub} Bs.</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); t.url_foto && window.open(t.url_foto, '_blank'); }} className="mt-4 w-full bg-blue-600 py-2 rounded-xl text-[9px] font-black uppercase">Ver Foto 🔍</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÓN FINAL DE ACCIÓN */}
                <div className="mt-2 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      if (grupo.saldo_tabla <= 0) {
                        entregarSoloTrabajos(grupo.nombre); 
                      } else {
                        entregarPedidoFinalv2(grupo.nombre);
                      }
                    }}
                    className={`w-full h-14 rounded-[22px] font-black text-[11px] uppercase tracking-[2px] shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center ${grupo.saldo_tabla > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
                  >
                    {grupo.saldo_tabla > 0 ? (
                      <>
                        <span>💰 Saldo: {grupo.saldo_tabla} Bs.</span>
                        <span className="text-[8px] opacity-70">Cobrar y Entregar</span>
                      </>
                    ) : (
                      <>
                        <span>📦 Confirmar Entrega</span>
                        <span className="text-[8px] opacity-70">El pedido ya fue pagado</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    
    <style dangerouslySetInnerHTML={{ __html: `
      .perspective { perspective: 1000px; }
      .transform-style-3d { transform-style: preserve-3d; }
      .backface-hidden { backface-visibility: hidden; }
      .rotate-y-180 { transform: rotateY(180deg); }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `}} />
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
      
      {/* HEADER ÚNICO */}
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">
            Balance Financiero
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Análisis en tiempo real • {anioFiltro}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setMostrarDashboard(false);
            setPedidosSeleccionados([]); 
          }}
          className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"
        >✕</button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 scrollbar-hide bg-[#F8FAFC]">
        
        {/* SELECTORES DE TIEMPO */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 items-center">
          <select 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(Number(e.target.value))}
            className="flex-1 bg-slate-50 border-none text-slate-700 font-black text-[10px] uppercase rounded-xl p-3 outline-none cursor-pointer"
          >
            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select 
            value={anioFiltro} 
            onChange={(e) => setAnioFiltro(Number(e.target.value))}
            className="w-24 bg-slate-50 border-none text-slate-700 font-black text-[10px] uppercase rounded-xl p-3 outline-none cursor-pointer"
          >
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        
        {(() => {
          const mesPad = String(mesFiltro + 1).padStart(2, '0');
          const patron = `${anioFiltro}-${mesPad}`;

          const ventasDelMes = listaVentas.filter((v: any) => v.fecha && String(v.fecha).includes(patron));
          const gastosDelMes = listaGastos.filter((g: any) => g.fecha && String(g.fecha).includes(patron));

          const ingresosTotales = ventasDelMes.reduce((acc: number, v: any) => acc + (Number(v.pedido_total) || 0), 0);
          const cobradoReal = ventasDelMes.reduce((acc: number, v: any) => acc + (Number(v.cuenta) || 0), 0);
          const totalGastos = gastosDelMes.reduce((acc: number, g: any) => acc + (Number(g.monto) || 0), 0);
          const utilidad = cobradoReal - totalGastos;

          // --- LÓGICA ACUMULATIVA ---
          const obtenerDatosComparativosLíneas = () => {
            const diasEnMes = new Date(anioFiltro, mesFiltro + 1, 0).getDate();
            const datos = [];
            let acIn = 0; 
            let acEg = 0; 

            for (let d = 1; d <= diasEnMes; d++) {
              const diaPad = String(d).padStart(2, '0');
              const fechaDia = `${patron}-${diaPad}`;
              
              const ingresosDia = ventasDelMes
                .filter((v: any) => String(v.fecha).startsWith(fechaDia))
                .reduce((acc: number, v: any) => acc + (Number(v.cuenta) || 0), 0);
                
              const gastosDia = gastosDelMes
                .filter((g: any) => String(g.fecha).startsWith(fechaDia))
                .reduce((acc: number, g: any) => acc + (Number(g.monto) || 0), 0);

              acIn += ingresosDia;
              acEg += gastosDia;

              datos.push({ 
                dia: d, 
                ingresos: acIn, 
                egresos: acEg 
              });
            }
            return datos;
          };
          const datosLíneas = obtenerDatosComparativosLíneas();

          const obtenerDatosServiciosPopularesConPorcentaje = () => {
            const conteo: { [key: string]: number } = {};
            let totalGeneral = 0;
            ventasDelMes.forEach((v: any) => {
              if (v.detalle_precios && Array.isArray(v.detalle_precios)) {
                v.detalle_precios.forEach((item: any) => {
                  const nombre = item.servicio ? item.servicio.split(' ')[0] : "S/N";
                  const cant = Number(item.cantidad) || 1;
                  conteo[nombre] = (conteo[nombre] || 0) + cant;
                  totalGeneral += cant;
                });
              }
            });
            return Object.entries(conteo).map(([name, value]) => ({
              name,
              value,
              porcentaje: totalGeneral > 0 ? ((value / totalGeneral) * 100).toFixed(0) : 0
            })).sort((a, b) => b.value - a.value).slice(0, 5);
          };

          const datosServicios = obtenerDatosServiciosPopularesConPorcentaje();

          return (
            <>
              {/* TARJETAS DE RESULTADOS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-white p-4 rounded-[25px] border border-slate-100 text-center">
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

              {/* AUDITORÍA DUAL */}
              <div className="bg-white rounded-[30px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-50 bg-slate-50/30">
                  <button 
                    onClick={() => setVerTipoAuditoria('gastos')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[2px] transition-all ${verTipoAuditoria === 'gastos' ? 'text-rose-600 bg-white border-b-2 border-rose-600' : 'text-slate-400 opacity-60'}`}
                  >📉 Egresos</button>
                  <button 
                    onClick={() => setVerTipoAuditoria('ingresos')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[2px] transition-all ${verTipoAuditoria === 'ingresos' ? 'text-emerald-600 bg-white border-b-2 border-emerald-600' : 'text-slate-400 opacity-60'}`}
                  >📈 Ingresos</button>
                </div>

                <div className="divide-y divide-slate-50 max-h-[280px] overflow-y-auto scrollbar-hide">
                  {verTipoAuditoria === 'gastos' ? (
                    gastosDelMes.length > 0 ? gastosDelMes.map((g: any, i: number) => (
                      <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700 uppercase leading-none mb-1">{g.categoria}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[180px]">{g.descripcion || 'Sin detalle'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">-{Number(g.monto).toLocaleString()} Bs.</p>
                          <p className="text-[7px] text-slate-300 font-bold">{g.fecha?.split('T')[0]}</p>
                        </div>
                      </div>
                    )) : <div className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase">No hay gastos en {patron}</div>
                  ) : (
                    ventasDelMes.length > 0 ? ventasDelMes.map((v: any, i: number) => (
                      <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 border-l-4 border-l-emerald-400/20">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-700 uppercase leading-none mb-1">{v.nombre_cliente}</span>
                          <span className="text-[8px] text-emerald-500 font-bold uppercase truncate max-w-[200px]">{v.detalle_servicio || 'Servicio registrado'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600">+{Number(v.cuenta).toLocaleString()} Bs.</p>
                          <p className="text-[7px] text-slate-300 font-bold">{v.fecha?.split('T')[0]}</p>
                        </div>
                      </div>
                    )) : <div className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase">No hay ingresos en {patron}</div>
                  )}
                </div>
              </div>

              {/* BOTÓN GENERAR INFORME */}
              <button className="w-full mt-6 h-16 bg-blue-600 rounded-[25px] font-black text-xs text-white uppercase tracking-[4px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                📥 Generar Informe
              </button>

              <div className="flex items-center gap-4 my-10">
                <div className="h-[1px] flex-1 bg-slate-200"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[3px]">Análisis Visual</span>
                <div className="h-[1px] flex-1 bg-slate-200"></div>
              </div>

              {/* SECCIÓN DE GRÁFICOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                
                {/* 1. ÁREA: INGRESOS POR JORNADA */}
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm h-[320px] flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingresos por Jornada</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={obtenerDatosVentasSemanales()}>
                        <defs>
                          <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94A3B8'}} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                        <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorIngreso)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. PIE: TOP SERVICIOS */}
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm h-[320px] flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 w-full">Top Servicios</h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={datosServicios} 
                          cx="50%" cy="50%" 
                          innerRadius={60} outerRadius={85} 
                          paddingAngle={5} dataKey="value"
                          labelLine={false}
                          label={(props: any) => {
                            const { cx, cy, midAngle, innerRadius, outerRadius, porcentaje } = props;
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="white" className="text-[10px] font-black" textAnchor="middle" dominantBaseline="central">
                                {`${porcentaje}%`}
                              </text>
                            );
                          }}
                        >
                          {datosServicios.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_DASHBOARD[index % COLORS_DASHBOARD.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props: any) => [`${value} ventas (${props.payload.porcentaje}%)`, name]} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. BAR: COMPARATIVA DE ORIGEN (CORREGIDO md:col-span-1) */}
<div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm h-[320px] flex flex-col md:col-span-1">
  <div className="mb-4">
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Comparativa de Origen</h3>
    <p className="text-[12px] font-black text-slate-800 uppercase italic">Ingresos por Categoría</p>
  </div>

  <div className="flex-1 w-full overflow-hidden">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={obtenerDatosVS()} 
        margin={{ top: 30, right: 10, left: -20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          interval={0}
          height={30}
          tick={{
            fontSize: 7.5, 
            fontWeight: '900', 
            fill: '#64748B'
          }}
        />

        <YAxis hide={true} />
        
        <Tooltip 
          cursor={{fill: '#F8FAFC', radius: 15}} 
          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
        />

        <Bar dataKey="total" radius={[10, 10, 10, 10]} barSize={40}>
          {obtenerDatosVS().map((entry, index) => (
            <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B'][index % 3]} />
          ))}
          
          <LabelList 
            dataKey="total" 
            position="top"
            content={(props: any) => {
              const { x, y, width, value } = props;
              return (
                <text 
                  x={x + width / 2} 
                  y={y - 12} 
                  fill="#1E293B" 
                  style={{ fontSize: '10px', fontWeight: '900' }}
                  textAnchor="middle"
                >
                  {`${Number(value).toLocaleString()} Bs.`}
                </text>
              );
            }} 
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

{/* 4. LINE: MONITOR ACUMULATIVO (CORREGIDO A ESTILO BLANCO) */}
{/* CAMBIADO: h-[380px] -> h-[320px] para igualar al anterior */}
<div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm h-[320px] flex flex-col md:col-span-1">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crecimiento Mensual</h3>
      <p className="text-[14px] font-black text-slate-800 uppercase italic">Flujo Acumulado</p>
    </div>
    <div className="flex gap-4 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <span className="text-[8px] text-slate-500 font-black uppercase">In</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
        <span className="text-[8px] text-slate-500 font-black uppercase">Out</span>
      </div>
    </div>
  </div>
  <div className="flex-1 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={datosLíneas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis 
          dataKey="dia" 
          axisLine={false} 
          tickLine={false} 
          tick={{fontSize: 9, fontWeight: 'bold', fill: '#94A3B8'}} 
          interval={4}
        />
        <YAxis hide={false} axisLine={false} tickLine={false} tick={{fontSize: 8, fill: '#94A3B8'}} />
        <Tooltip 
          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px' }}
          itemStyle={{ fontWeight: 'bold' }}
        />
        <Line 
          type="monotone" 
          dataKey="ingresos" 
          stroke="#10B981" 
          strokeWidth={4} 
          dot={false} 
          activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} 
        />
        <Line 
          type="monotone" 
          dataKey="egresos" 
          stroke="#F43F5E" 
          strokeWidth={4} 
          dot={false} 
          activeDot={{ r: 6, strokeWidth: 0, fill: '#F43F5E' }} 
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>

              </div>
            </>
          );
        })()}
      </div>
    </div>
  </div>
)}
      </main>
    );
    }