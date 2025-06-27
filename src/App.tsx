import React, { useState, useCallback, useMemo, useEffect } from 'react';
import data from './data/facturas_por_vendedor_actualizado_limpio.json';
import './App.css';

interface Factura {
  numero_factura: string;
  cliente: string;
  fecha: string;
  referencia: string;
  referencia_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number | null;
  divisa: string;
  unidad_medida: string;
  categoria_producto?: string;
  modelo?: string;
  tipo_producto?: string;
  oportunidad_refacciones?: number | null;
}

type VendedorData = Record<string, Factura[]>;

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const App: React.FC = () => {
  const vendedores = Object.keys(data as VendedorData);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('');
  const [busquedaTemp, setBusquedaTemp] = useState('');
  const busquedaEmpresa = useDebounce(busquedaTemp, 300);

  const allFacturas = useMemo(() => {
    let facturas: Factura[] = [];
    vendedores.forEach((v) => {
      facturas.push(...(data as VendedorData)[v]);
    });
    return facturas;
  }, [vendedores]);

  const dataFiltrada = useCallback(() => {
    let facturas = [...allFacturas];
    if (vendedorSeleccionado.trim()) {
      facturas = facturas.filter(f => (data as VendedorData)[vendedorSeleccionado]?.includes(f));
    }
    if (busquedaEmpresa.trim()) {
      facturas = facturas.filter(f =>
        f.cliente.toLowerCase().includes(busquedaEmpresa.toLowerCase()) ||
        f.nombre_producto.toLowerCase().includes(busquedaEmpresa.toLowerCase())
      );
    }
    return facturas;
  }, [allFacturas, vendedorSeleccionado, busquedaEmpresa]);

  const resumen = (facturas: Factura[]) => {
    const totalClientes = new Set(facturas.map(f => f.cliente)).size;
    const oportunidades = facturas.filter(f => (f.categoria_producto || '').toLowerCase().includes("oportunidad")).length;
    const mantenimiento = facturas.filter(f => (f.categoria_producto || '').toLowerCase().includes("mantenimiento")).length;
    const totalVentasUSD = facturas.reduce((acc, f) => acc + (f.divisa === 'USD' ? (f.subtotal ?? 0) : 0), 0);
    const oportunidadRefacciones = facturas.reduce((acc, f) => acc + (f.oportunidad_refacciones ?? 0), 0);
    return { totalClientes, oportunidades, mantenimiento, totalVentasUSD, oportunidadRefacciones };
  };

  const facturas = dataFiltrada();
  const stats = resumen(facturas);

  const oportunidadesPorModelo = Object.entries(
    facturas.reduce((acc, f) => {
      if (f.modelo && typeof f.oportunidad_refacciones === 'number') {
        acc[f.modelo] = (acc[f.modelo] || 0) + f.oportunidad_refacciones;
      }
      return acc;
    }, {} as Record<string, number>)
  );

  const formatCurrency = (value: number) =>
    `$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="centered-container">
      <h2 className="text-xl font-semibold mb-2 mt-4">Valor Estimado de Refacciones por Modelo (USD)</h2>
      <table className="min-w-full bg-white shadow rounded overflow-hidden mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Modelo</th>
            <th className="p-2 text-left">Total Oportunidades</th>
          </tr>
        </thead>
        <tbody>
          {oportunidadesPorModelo.map(([modelo, total], idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{modelo}</td>
              <td className="p-2">{formatCurrency(Number(total || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h1 className="text-2xl font-bold mb-4">Dashboard de Análisis de Ventas</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border p-2 rounded"
          onChange={(e) => setVendedorSeleccionado(e.target.value)}
          value={vendedorSeleccionado}
        >
          <option value=''>Todos los Vendedores</option>
          {vendedores.map((v, idx) => (
            <option key={idx} value={v}>{v}</option>
          ))}
        </select>

        <input
          className="border p-2 rounded flex-1"
          placeholder="Buscar empresa..."
          value={busquedaTemp}
          onChange={(e) => setBusquedaTemp(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 shadow rounded">Total Clientes: {stats.totalClientes}</div>
        <div className="bg-white p-4 shadow rounded">Con Oportunidades: {stats.oportunidades}</div>
        <div className="bg-white p-4 shadow rounded">Oport. Mantenimiento: {stats.mantenimiento}</div>
        <div className="bg-white p-4 shadow rounded">Oport. Refacciones por impresora: {formatCurrency(stats.oportunidadRefacciones)}</div>
        <div className="bg-white p-4 shadow rounded">Total Ventas (USD): {formatCurrency(stats.totalVentasUSD)}</div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Análisis de Oportunidades de Venta</h2>
      <table className="min-w-full bg-white shadow rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Fecha</th>
            <th className="p-2 text-left">Cliente</th>
            <th className="p-2 text-left">Producto</th>
            <th className="p-2 text-left">Modelo</th>
            <th className="p-2 text-left">Tipo</th>
            <th className="p-2 text-left">Cantidad</th>
            <th className="p-2 text-left">Unidad</th>
            <th className="p-2 text-left">Subtotal</th>
            <th className="p-2 text-left">Divisa</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{f.fecha}</td>
              <td className="p-2">{f.cliente}</td>
              <td className="p-2">{f.nombre_producto}</td>
              <td className="p-2">{f.modelo || '-'}</td>
              <td className="p-2">{f.tipo_producto || '-'}</td>
              <td className="p-2">{f.cantidad}</td>
              <td className="p-2">{f.unidad_medida}</td>
              <td className="p-2">{formatCurrency(f.subtotal ?? 0)}</td>
              <td className="p-2">{f.divisa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
