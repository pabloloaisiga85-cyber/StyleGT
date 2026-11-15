-- ==============================================================================
-- STYLEGT - Políticas RLS para Panel Admin Autenticado (Supabase Auth)
-- Ejecuta este script UNA SOLA VEZ en: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Políticas de escritura para usuarios autenticados (Admin) en Categorías
DROP POLICY IF EXISTS "Admin gestiona categorias" ON categorias;
CREATE POLICY "Admin gestiona categorias"
  ON categorias FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Políticas de lectura completa y escritura para Admin en Productos (incluye inactivos)
DROP POLICY IF EXISTS "Admin gestiona productos" ON productos;
CREATE POLICY "Admin gestiona productos"
  ON productos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Políticas de escritura para Admin en Variantes
DROP POLICY IF EXISTS "Admin gestiona variantes" ON variantes_producto;
CREATE POLICY "Admin gestiona variantes"
  ON variantes_producto FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Políticas de gestión de Pedidos e Items para Admin
DROP POLICY IF EXISTS "Admin gestiona pedidos" ON pedidos;
CREATE POLICY "Admin gestiona pedidos"
  ON pedidos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin gestiona items_pedido" ON items_pedido;
CREATE POLICY "Admin gestiona items_pedido"
  ON items_pedido FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Políticas de Storage para subir/editar imágenes en el bucket 'productos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura publica imagenes productos" ON storage.objects;
CREATE POLICY "Lectura publica imagenes productos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "Admin sube imagenes productos" ON storage.objects;
CREATE POLICY "Admin sube imagenes productos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'productos');

DROP POLICY IF EXISTS "Admin actualiza imagenes productos" ON storage.objects;
CREATE POLICY "Admin actualiza imagenes productos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "Admin elimina imagenes productos" ON storage.objects;
CREATE POLICY "Admin elimina imagenes productos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'productos');
