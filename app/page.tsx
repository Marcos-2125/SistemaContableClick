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
  // ==========================================
  // PEGA LA FUNCIÓN AQUÍ ABAJO:
  // ==========================================
 const finalizarPedido = async () => {
    if (trabajos.length === 0) return alert("Debes agregar al menos un trabajo");

    try {
      // Calculamos el total (asegurando que sean números)
      const totalActual = trabajos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

      // 1. Insertamos con nombres de tabla y columnas en minúsculas
      const { data, error } = await supabase
        .from('pedidos_activos') // <--- Tabla en minúsculas
        .insert([
          {
            nombre_cliente: nombreClienteInput,     // <--- Columna en minúsculas
            telefono_cliente: telClienteInput,     // <--- Columna en minúsculas
            tipo_cliente: tipoClienteInput || 'Regular',
            trabajos: trabajos,                     // <--- Columna en minúsculas
            total_pedido: totalActual,              // <--- Columna en minúsculas
            acuenta: montoAcuenta,
      saldo: (trabajos.reduce((acc, t) => acc + (t.precio || 0), 0) - montoAcuenta),
      estado: 'Pendiente'
          }
        ])
        .select();

      if (error) {
        // Mostramos el error exacto si Supabase rechaza algo
        console.error("Error específico de Supabase:", error.code, error.message, error.details);
        alert(`Error ${error.code}: ${error.message}`);
        return;
      }

      alert("¡Pedido registrado con éxito en la base de datos!");
      
      // Limpiamos todo tras el éxito
      setTrabajos([]);
      setNombreClienteInput('');
      setTelClienteInput('');
      setTipoClienteInput('Regular');
      setAccionInicio('menu');

    } catch (err: any) {
      console.error("Error de código:", err);
      alert("Ocurrió un error inesperado en el sistema");
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

           {/* VISTA: REGISTRO DE PEDIDO (MULTITRABAJO Y BUSCADOR INTELIGENTE) */}
            {accionInicio === 'nuevo-pedido' && (
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-gray-800 italic">Registrar Pedido</h2>
                  <button onClick={() => { setAccionInicio('menu'); setTrabajos([]); setNombreClienteInput(''); setTelClienteInput(''); setTipoClienteInput(''); }} className="bg-gray-100 text-gray-400 h-10 w-10 rounded-full font-bold">✕</button>
                </div>

                <div className="space-y-4">
                  {/* SECCIÓN DATOS DEL CLIENTE */}
                  <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">Telefono</label>
                        <input 
                          type="tel" 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none shadow-sm"
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
                      <div className="w-24 text-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                        <div className="w-full h-[46px] bg-gray-200 border border-gray-300 rounded-xl font-black text-[9px] text-gray-600 flex items-center justify-center uppercase shadow-inner">
                          {tipoClienteInput || "---"}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">Nombre del Cliente</label>
  <input 
    type="text" 
    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none shadow-sm"
    value={nombreClienteInput}
    onChange={(e) => {
      setNombreClienteInput(e.target.value);
      setMostrarSugerencias(true); // <--- Mostramos al escribir
      if (e.target.value === "") { 
        setTipoClienteInput(""); 
        setTelClienteInput(""); 
        setMostrarSugerencias(false); 
      }
    }}
  />
                      
                      {/* LISTA DE SUGERENCIAS CORREGIDA */}
  {mostrarSugerencias && nombreClienteInput.length > 1 && (
    <div className="absolute z-30 w-full mt-1 bg-white shadow-2xl rounded-2xl border border-gray-100 max-h-48 overflow-y-auto">
      {listaClientes
        .filter(c => c.Nombre.toLowerCase().includes(nombreClienteInput.toLowerCase()))
        .map(c => (
          <div 
            key={c.id} 
            className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-gray-50 flex justify-between items-center transition-colors"
            onClick={() => {
              setNombreClienteInput(c.Nombre);
              setTelClienteInput(c.Telefono);
              setTipoClienteInput(c.Tipo || 'Regular');
              setMostrarSugerencias(false); // <--- ¡AQUÍ SE CIERRA!
            }}
          >
            <span className="text-xs font-black uppercase">{c.Nombre}</span>
            <span className="text-[9px] font-bold opacity-70">{c.Tipo}</span>
          </div>
        ))}
    </div>
  )}
                    </div>
                  </div>

                  {/* LISTA DE TRABAJOS (Si hay alguno agregado) */}
                  {trabajos.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase ml-1">Trabajos en este pedido:</p>
                      {trabajos.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in zoom-in-95 duration-200">
                          <div className="text-[10px] font-bold">
                            <span className="text-blue-700 uppercase">{t.servicio}</span> <br/> 
                            {t.ancho}x{t.alto} • {t.cant} pz.
                          </div>
                          <button onClick={() => setTrabajos(trabajos.filter((_, i) => i !== idx))} className="bg-white text-red-500 h-8 w-8 rounded-full shadow-sm font-bold">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

        {/* FORMULARIO PARA AGREGAR TRABAJO INDIVIDUAL */}
<div className="p-5 rounded-3xl space-y-4 border-2 border-blue-100 bg-white shadow-md relative">
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">Servicio</label>
    <select
      className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 outline-none appearance-none"
      value={material}
      onChange={(e) => setMaterial(e.target.value)}
    >
      <option value="">-- Elige un servicio --</option>
      {listaServicios.map((s, i) => (
        <option key={i} value={s}>{s}</option>
      ))}
    </select>
  </div>

  <div className="grid grid-cols-3 gap-2">
    <div>
      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Ancho</label>
      <input id="ancho" type="text" placeholder="0.00" className="w-full p-3 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-blue-500" />
    </div>
    <div>
      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Alto</label>
      <input id="alto" type="text" placeholder="0.00" className="w-full p-3 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-blue-500" />
    </div>
    <div>
      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cant.</label>
      <input id="cant" type="number" defaultValue="1" className="w-full p-3 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-blue-500" />
    </div>
  </div>

  {/* NUEVOS CAMPOS: PRECIO Y DETALLES POR TRABAJO */}
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Precio Unit.</label>
      <input id="precio_unit" type="number" placeholder="0.00" className="w-full p-3 rounded-xl text-sm font-bold border border-blue-500 bg-blue-50 outline-none" />
    </div>
    <div>
      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Detalle/Nota</label>
      <input id="detalle_trabajo" type="text" placeholder="Ej: Ojales cada 50cm" className="w-full p-3 rounded-xl text-xs font-bold border border-gray-100 outline-none focus:border-blue-500" />
    </div>
  </div>

  <button 
    onClick={() => {
      const s = material;
      const an = (document.getElementById('ancho') as HTMLInputElement).value;
      const al = (document.getElementById('alto') as HTMLInputElement).value;
      const ct = (document.getElementById('cant') as HTMLInputElement).value;
      const pr = (document.getElementById('precio_unit') as HTMLInputElement).value;
      const dt = (document.getElementById('detalle_trabajo') as HTMLInputElement).value;
      
      if(!s || !an || !al || !pr) return alert("Por favor completa Servicio, Medidas y Precio");
      
      // Ahora guardamos el precio real y el detalle
      setTrabajos([...trabajos, { 
        servicio: s, 
        ancho: an, 
        alto: al, 
        cant: ct, 
        precio: Number(pr) * Number(ct), // Total de este item
        detalle: dt 
      }]);

      // Limpiar inputs
      setMaterial('');
      (document.getElementById('ancho') as HTMLInputElement).value = '';
      (document.getElementById('alto') as HTMLInputElement).value = '';
      (document.getElementById('cant') as HTMLInputElement).value = '1';
      (document.getElementById('precio_unit') as HTMLInputElement).value = '';
      (document.getElementById('detalle_trabajo') as HTMLInputElement).value = '';
    }}
    className="w-full p-3 rounded-xl font-black text-[10px] bg-emerald-500 text-white uppercase shadow-lg active:scale-95 transition-all"
  >
    + AGREGAR OTRO TRABAJO
  </button>
</div>

{/* SECCIÓN DE PAGO (ACUENTA Y SALDO) */}
<div className="mt-4 p-5 bg-slate-800 rounded-3xl text-white shadow-xl space-y-3">
  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
    <span className="text-[10px] font-black uppercase">Total Pedido:</span>
    <span className="text-xl font-mono font-bold text-emerald-400">
      {trabajos.reduce((acc, t) => acc + (t.precio || 0), 0).toFixed(2)} Bs.
    </span>
  </div>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-[9px] font-black text-slate-400 uppercase">A cuenta</label>
      <input 
        id="monto_acuenta" 
        type="number" 
        placeholder="0.00" 
        className="w-full p-3 bg-slate-700 border-none rounded-xl text-white font-bold"
        onChange={() => {
          // Esto es opcional para calcular el saldo visualmente si quieres
        }}
      />
    </div>
    <div>
      <label className="text-[9px] font-black text-slate-400 uppercase">Saldo Pendiente</label>
      <div className="w-full p-3 bg-slate-900 rounded-xl text-red-400 font-bold text-center">
        {/* El saldo se calcula restando el input del total */}
        CALCULO AUTOMÁTICO
      </div>
    </div>
  </div>
</div>

<button 
  onClick={finalizarPedido}
  className="w-full p-5 rounded-2xl font-black text-white shadow-2xl bg-blue-600 active:scale-95 transition-all mt-4 italic"
>
  FINALIZAR PEDIDO COMPLETO
</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

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
