-- Casablanca · Daniel (9-oct-2026): «0992834833 elimínala» → Ana Cristina Grijalva no va al viaje.
-- No se borra (regla de la casa: nada se borra): queda inactiva, ya no puede entrar ni sale en la lista.
-- Sus gastos, si tuviera, siguen en el historial. Para volverla a activar: Administrar → Invitados → Desbloquear.
-- Idempotente. Corre después de 015 (el guard deja pasar la conexión directa).
set search_path = marea, public;
update personas set activo = false where telefono = '593992834833' and activo;
