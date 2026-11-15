-- ==============================================================================
-- STYLEGT - Soporte para Método de Pago (Contra Entrega / Transferencia)
-- Ejecuta este script UNA SOLA VEZ en: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'contra_entrega',
  ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente';

-- Función segura para que el checkout público registre el método elegido
CREATE OR REPLACE FUNCTION registrar_metodo_pago(
  p_pedido_id BIGINT,
  p_metodo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pedidos
  SET
    metodo_pago = CASE WHEN p_metodo IN ('contra_entrega', 'transferencia') THEN p_metodo ELSE 'contra_entrega' END,
    estado_pago = 'pendiente'
  WHERE id = p_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_metodo_pago(BIGINT, TEXT) TO anon, authenticated;
