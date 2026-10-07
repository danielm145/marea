-- v27 · cada plan puede tener su propia foto de portada (Daniel, 7-oct-2026). Idempotente. Solo esquema marea.
-- Guarda la ruta en el bucket marea-muro (la misma que usan las fotos del álbum).
alter table marea.eventos add column if not exists foto text;
