-- ==============================================================================
-- STYLEGT - Método de Pago + Foto de Comprobante en Web
-- Ejecuta este script UNA SOLA VEZ en: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'contra_entrega',
  ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- Función segura para registrar método de pago y URL del comprobante
CREATE OR REPLACE FUNCTION registrar_metodo_pago(
  p_pedido_id BIGINT,
  p_metodo TEXT,
  p_comprobante_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pedidos
  SET
    metodo_pago = CASE WHEN p_metodo IN ('contra_entrega', 'transferencia') THEN p_metodo ELSE 'contra_entrega' END,
    estado_pago = 'pendiente',
    comprobante_url = NULLIF(TRIM(COALESCE(p_comprobante_url, '')), '')
  WHERE id = p_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_metodo_pago(BIGINT, TEXT, TEXT) TO anon, authenticated;

-- Bucket dedicado para comprobantes de transferencia
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura publica de comprobantes" ON storage.objects;
CREATE POLICY "Lectura publica de comprobantes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Clientes suben comprobantes" ON storage.objects;
CREATE POLICY "Clientes suben comprobantes"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'comprobantes');
