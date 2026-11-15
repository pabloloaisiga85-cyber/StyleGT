-- ============================================================================
-- StyleGT: Seguimiento de Pedido (RPC segura para clientes)
-- Ejecuta este script en el SQL Editor de Supabase (una sola vez).
-- Permite consultar un pedido solo cuando coinciden el ID y el teléfono.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consultar_pedido(p_id bigint, p_telefono text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_input text;
  v_order record;
  v_items jsonb;
BEGIN
  v_clean_input := regexp_replace(COALESCE(p_telefono, ''), '[^0-9]', '', 'g');
  IF length(v_clean_input) > 8 AND left(v_clean_input, 3) = '505' THEN
    v_clean_input := substr(v_clean_input, 4);
  END IF;

  IF p_id IS NULL OR length(v_clean_input) < 7 THEN
    RETURN NULL;
  END IF;

  SELECT p.id,
         p.nombre_cliente,
         p.total,
         p.estado,
         p.estado_pago,
         p.metodo_pago,
         p.created_at
  INTO v_order
  FROM public.pedidos p
  WHERE p.id = p_id
    AND (
      CASE
        WHEN length(regexp_replace(COALESCE(p.telefono, ''), '[^0-9]', '', 'g')) > 8
         AND left(regexp_replace(COALESCE(p.telefono, ''), '[^0-9]', '', 'g'), 3) = '505'
        THEN substr(regexp_replace(COALESCE(p.telefono, ''), '[^0-9]', '', 'g'), 4)
        ELSE regexp_replace(COALESCE(p.telefono, ''), '[^0-9]', '', 'g')
      END
    ) = v_clean_input
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'cantidad', ip.cantidad,
        'precio_unitario', ip.precio_unitario,
        'nombre', COALESCE(pr.nombre, 'Producto'),
        'talla', COALESCE(vp.talla, '-'),
        'color', COALESCE(vp.color, '-')
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.items_pedido ip
  LEFT JOIN public.variantes_producto vp ON vp.id = ip.variante_id
  LEFT JOIN public.productos pr ON pr.id = vp.producto_id
  WHERE ip.pedido_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'nombre_cliente', v_order.nombre_cliente,
    'total', v_order.total,
    'estado', v_order.estado,
    'estado_pago', v_order.estado_pago,
    'metodo_pago', v_order.metodo_pago,
    'created_at', v_order.created_at,
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_pedido(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_pedido(bigint, text) TO anon, authenticated;
