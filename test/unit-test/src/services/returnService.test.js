import { beforeEach, describe, expect, test, vi } from 'vitest';

const createDefectiveReturn = vi.fn();
const getReturnById = vi.fn();
const listReturns = vi.fn();

vi.mock('../../../../src/repositories/returnRepository.js', () => ({
  createDefectiveReturn,
  getReturnById,
  listReturns,
}));

const { createReturnService } = await import('../../../../src/services/returnService.js');

describe('createReturnService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rechaza líneas duplicadas', async () => {
    await expect(
      createReturnService(
        {
          idVenta: '11111111-1111-1111-1111-111111111111',
          detalles: [
            { idDetalleVenta: '22222222-2222-2222-2222-222222222222', cantidad: 1 },
            { idDetalleVenta: '22222222-2222-2222-2222-222222222222', cantidad: 1 },
          ],
        },
        { id: 'u1' },
      ),
    ).rejects.toMatchObject({ code: 'BR001' });
  });

  test('mapea devolución creada con canje', async () => {
    createDefectiveReturn.mockResolvedValue({
      status: 'OK',
      devolucion: {
        id_devolucion: '33333333-3333-3333-3333-333333333333',
        ventaAnulada: false,
      },
    });
    getReturnById.mockResolvedValue({
      id_devolucion: '33333333-3333-3333-3333-333333333333',
      fecha_hora: '2026-11-03T00:00:00.000Z',
      motivo: 'COMPONENTE_DEFECTUOSO',
      observacion: null,
      id_venta: '11111111-1111-1111-1111-111111111111',
      id_usuario: 'u1',
      cliente_nombre: 'Mostrador',
      nombre_usuario: 'admin',
      venta_estado: 'CONFIRMADA',
      detalles: [
        {
          id_detalle_devolucion: 'd1',
          id_detalle_venta: '22222222-2222-2222-2222-222222222222',
          id_producto: 'p1',
          codigo: 'A1',
          nombre: 'Prod',
          cantidad: 1,
          resolucion: 'CANJE',
          monto_reembolso: 0,
        },
      ],
    });

    const result = await createReturnService(
      {
        idVenta: '11111111-1111-1111-1111-111111111111',
        detalles: [{ idDetalleVenta: '22222222-2222-2222-2222-222222222222', cantidad: 1 }],
      },
      { id: 'u1' },
    );

    expect(result.detalles[0].resolucion).toBe('CANJE');
    expect(result.montoReembolsoTotal).toBe(0);
    expect(result.ventaAnulada).toBe(false);
  });
});
