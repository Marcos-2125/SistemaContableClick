'use client';
import { useState, useEffect } from 'react';
// 1. Importamos la conexión
import { supabase } from './supabase';

export default function Home() {
  const [pestaña, setPestaña] = useState('inicio');
  const [accionInicio, setAccionInicio] = useState('menu');

  // --- ESTADOS PARA TUS LISTAS DE CONTROL ---
  const [listaServicios, setListaServicios] = useState<string[]>([]);
  const [costosProduccion, setCostosProduccion] = useState([
    { item: 'Tinta m2', precio: 2 },
    { item: 'Ojalillos cien', precio: 15 }
  ]);
  const [nuevoServicioInput, setNuevoServicioInput] = useState('');
  const [nuevoCostoInput, setNuevoCostoInput] = useState({ item: '', precio: '' });

  // --- NUEVOS ESTADOS PARA CLIENTES (CONECTADOS A BD) ---
  const [listaClientes, setListaClientes] = useState<any[]>([]);
  const [nombreClienteInput, setNombreClienteInput] = useState('');
  const [telClienteInput, setTelClienteInput] = useState('');
  const [tipoClienteInput, setTipoClienteInput] = useState('Regular'); // <--- NUEVO ESTADO

  // --- CARGAR DATOS AL INICIAR (SERVICIOS Y CLIENTES) ---
  useEffect(() => {
    async function descargarDatos() {
      // Cargar Servicios
      const { data: dataServ } = await supabase
        .from('Servicios')
        .select('Nombre')
        .order('Nombre', { ascending: true });
      if (dataServ) setListaServicios(dataServ.map(s => s.Nombre));

      // Cargar Clientes
      const { data: dataClie } = await supabase
        .from('Clientes')
        .select('*')
        .order('Nombre', { ascending: true });
      if (dataClie) setListaClientes(dataClie);
    }
    descargarDatos();
  }, []);

  // --- FUNCIÓN GUARDAR CLIENTE EN BD ---
  const guardarClienteBD = async () => {
    if (nombreClienteInput.trim() === "") return alert("El nombre es obligatorio");

    const { data, error } = await supabase
      .from('Clientes')
      .insert([{ 
        Nombre: nombreClienteInput.toUpperCase(), 
        Telefono: telClienteInput,
        Tipo: tipoClienteInput // <--- AGREGADO EL TIPO
      }])
      .select();

    if (!error) {
      setListaClientes([...listaClientes, data[0]]);
      setNombreClienteInput('');
      setTelClienteInput('');
      setTipoClienteInput('Regular'); // Reset a default
    } else {
      alert("Error al guardar cliente: " + error.message);
    }
  };

  // --- FUNCIÓN ELIMINAR CLIENTE ---
  const eliminarCliente = async (id: number, nombre: string) => {
    if (confirm(`¿Eliminar a ${nombre}?`)) {
      const { error } = await supabase.from('Clientes').delete().eq('id', id);
      if (!error) {
        setListaClientes(listaClientes.filter(c => c.id !== id));
      }
    }
  };

  // --- FUNCIONES DE SERVICIOS (MANTENIDAS) ---
  const eliminarServicio = async (nombreEliminar: string) => {
    if (confirm(`¿Estás seguro de eliminar "${nombreEliminar}"?`)) {
      const { error } = await supabase.from('Servicios').delete().eq('Nombre', nombreEliminar);
      if (!error) setListaServicios(listaServicios.filter(s => s !== nombreEliminar));
    }
  };

  const editarServicio = async (nombreActual: string) => {
    const nuevoNombre = prompt("Editar nombre del servicio:", nombreActual);
    if (nuevoNombre && nuevoNombre.trim() !== "" && nuevoNombre !== nombreActual) {
      const nombreMayus = nuevoNombre.toUpperCase();
      const { error } = await supabase.from('Servicios').update({ Nombre: nombreMayus }).eq('Nombre', nombreActual);
      if (!error) setListaServicios(listaServicios.map(s => s === nombreActual ? nombreMayus : s));
    }
  };

  const guardarServicioBD = async () => {
    if (nuevoServicioInput.trim() !== "") {
      const nombreMayus = nuevoServicioInput.toUpperCase();
      const { error } = await supabase.from('Servicios').insert([{ Nombre: nombreMayus }]);
      if (!error) {
        setListaServicios([...listaServicios, nombreMayus]);
        setNuevoServicioInput('');
      }
    }
  };

  // --- ESTADOS ORIGINALES DE FORMULARIO ---
  const [tipoCliente, setTipoCliente] = useState('nuevo');
  const [material, setMaterial] = useState('');
  const [trabajos, setTrabajos] = useState<any[]>([]); // <--- PEGA ESTA LÍNEA AQUÍ
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [montoAcuenta, setMontoAcuenta] = useState(0); // <--- PEGA ESTA AQUÍ
  const [listaPedidosTaller, setListaPedidosTaller] = useState<any[]>([]);
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);
  // ==========================================
// --- FUNCIÓN MEJORADA: FINALIZAR PEDIDO (REPARTE EN 2 TABLAS) ---
  const finalizarPedido = async () => {
    if (trabajos.length === 0) return alert("Debes agregar al menos un trabajo");
    if (!nombreClienteInput) return alert("El nombre del cliente es obligatorio");

    try {
      const idPedidoActual = Date.now(); 
      const totalActual = trabajos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
      const saldoCalculado = totalActual - montoAcuenta;
      const resumenDetalle = trabajos.map(t => 
        `${t.cant} ${t.servicio.toUpperCase()} (${t.ancho}x${t.alto})`
      ).join(" / ");

      // PASO A: INSERTAR EN 'pedidos_activos' PARA EL TALLER
      const filasParaTaller = trabajos.map(t => ({
        id_pedido: idPedidoActual,
        nombre_cliente: nombreClienteInput.toUpperCase(),
        servicio: t.servicio,
        ancho: t.ancho,
        alto: t.alto,
        cantidad: Number(t.cant),
        detalle: t.detalle || '',
        estado: 'Pendiente'
      }));

      const { error: errorTaller } = await supabase.from('pedidos_activos').insert(filasParaTaller);
      if (errorTaller) throw errorTaller;

      // PASO B: ACTUALIZAR O CREAR EN 'registro_ventas'
      const { data: pedidoExistente } = await supabase
        .from('registro_ventas')
        .select('*')
        .eq('nombre_cliente', nombreClienteInput.toUpperCase())
        .eq('estado', 'Pendiente')
        .single();

      if (pedidoExistente) {
        const { error: errorUpdate } = await supabase
          .from('registro_ventas')
          .update({
            detalle_servicio: pedidoExistente.detalle_servicio + " // " + resumenDetalle,
            pedido_total: pedidoExistente.pedido_total + totalActual,
            cuenta: pedidoExistente.cuenta + montoAcuenta,
            saldo: (pedidoExistente.pedido_total + totalActual) - (pedidoExistente.cuenta + montoAcuenta)
          })
          .eq('id_pedido', pedidoExistente.id_pedido);
        if (errorUpdate) throw errorUpdate;
      } else {
        const { error: errorVenta } = await supabase
          .from('registro_ventas')
          .insert([{
            id_pedido: idPedidoActual,
            nombre_cliente: nombreClienteInput.toUpperCase(),
            telefono_cliente: telClienteInput,
            detalle_servicio: resumenDetalle,
            pedido_total: totalActual,
            cuenta: montoAcuenta,
            saldo: saldoCalculado,
            estado: 'Pendiente'
          }]);
        if (errorVenta) throw errorVenta;
      }

      alert("¡Pedido guardado y enviado al taller!");
      setTrabajos([]);
      setNombreClienteInput('');
      setTelClienteInput('');
      setMontoAcuenta(0);
      setAccionInicio('menu');

    } catch (err: any) {
      console.error("Error completo:", err);
      alert("Error: " + (err.message || "No se pudo guardar"));
    }
  };

  // ==========================================
  // --- PASO 2: FUNCIONES DE CONTROL DE TALLER ---
  // ==========================================
  
  const cargarPedidosTaller = async () => {
    const { data, error } = await supabase
      .from('pedidos_activos')
      .select('*')
      .neq('estado', 'Finalizado') 
      .order('id', { ascending: true });
    if (data) setListaPedidosTaller(data);
  };

  const cambiarEstadoPedido = async (id: number, nuevoEstado: string) => {
    const { error } = await supabase
      .from('pedidos_activos')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    if (!error) {
      cargarPedidosTaller(); 
    }
  };

  useEffect(() => {
    if (pestaña === 'pedidos') {
      cargarPedidosTaller();
    }
  }, [pestaña]);
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
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-2xl border-b-4 border-green-500 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Hoy Ingresó</p>
                    <p className="text-xl font-bold text-green-600 font-mono">0.00 Bs.</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-b-4 border-red-500 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Hoy Gastó</p>
                    <p className="text-xl font-bold text-red-600 font-mono">0.00 Bs.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-4xl">💰</span>
                    <span className="font-bold text-sm">Cobrar Venta</span>
                  </button>
                  <button className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
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
                  <button onClick={() => setAccionInicio('config-costos')} className="bg-slate-800 text-white p-6 rounded-3xl flex flex-col items-center justify-center gap-2 h-36 active:scale-95 transition-all">
                    <span className="text-3xl">🛠️</span>
                    <span className="font-bold text-[10px] uppercase text-center leading-tight">Costos de<br />Producción</span>
                  </button>
                </div>
              </>
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
                        {(trabajos.reduce((acc, t) => acc + (t.precio || 0), 0) - montoAcuenta).toFixed(2)}
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
      {/* --- PESTAÑA PEDIDOS (ESTILO SOFT MINIMAL) --- */}
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
              listaPedidosTaller.reduce((acc: any, pedido: any) => {
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
                  
                  {/* HEADER CLIENTE (SOFT) */}
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

                    {/* Resumen de estados en bolitas suaves */}
                    <div className="flex gap-3 items-center mr-4">
                      {grupo.espera > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span><span className="text-[10px] font-bold text-slate-400">{grupo.espera}</span></div>}
                      {grupo.haciendo > 0 && <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span><span className="text-[10px] font-bold text-orange-500">{grupo.haciendo}</span></div>}
                      <div className="text-[10px] font-bold text-slate-300">/</div>
                      <div className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{grupo.total}</div>
                    </div>
                    <span className={`text-slate-300 transition-transform ${abierto ? 'rotate-180' : ''}`}>▾</span>
                  </div>

                  {/* LISTA DE TRABAJOS (SOFT) */}
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

                            <div className="flex gap-2">
                              {!listo ? (
                                <>
                                  <button 
                                    onClick={() => cambiarEstadoPedido(trabajo.id, 'Pendiente')}
                                    className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase border transition-all ${trabajo.estado === 'Pendiente' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white border-transparent text-slate-300'}`}
                                  >
                                    Espera
                                  </button>
                                  <button 
                                    onClick={() => cambiarEstadoPedido(trabajo.id, 'Diseñando')}
                                    className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase border transition-all ${doing ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-transparent text-slate-300'}`}
                                  >
                                    Diseñar
                                  </button>
                                  <button 
                                    onClick={() => { if(confirm("¿Finalizar diseño?")) cambiarEstadoPedido(trabajo.id, 'Para Imprimir') }}
                                    className="px-4 h-9 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase hover:bg-blue-600 transition-colors"
                                  >
                                    Listo
                                  </button>
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
      <button onClick={() => setPestaña('reportes')} className={`flex flex-col items-center p-3 transition-all ${pestaña === 'reportes' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
        <span className="text-2xl font-bold italic">📊</span>
        <span className="text-[10px] font-black uppercase tracking-tighter">Caja</span>
      </button>
    </nav>
  </main>
);
}