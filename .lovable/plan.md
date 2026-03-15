
Objetivo
- Corregir definitivamente por qué al entrar con Binance aparece “debes iniciar sesión” y por qué el balance sale en 0 aunque la extensión esté abierta.

Qué está pasando
1. La wallet sí parece conectarse a nivel UI:
   - En la captura se ve una dirección arriba a la derecha (`0xa015...3490`) y red BSC.
2. Pero el sistema de autenticación no la está reconociendo como sesión válida para jugar:
   - En `/lobby`, `handleJoin()` exige `user` autenticado; si no existe, muestra “Debes iniciar sesión para jugar”.
3. Hay una desalineación entre “wallet conectada” y “usuario autenticado”:
   - `WalletButton` considera conectado si hay wallet o cuenta autenticada.
   - `Lobby` solo considera autenticado si existe `user`.
4. Además, el balance 0 en Binance apunta a que la app está leyendo otra cuenta/proveedor o no está enlazando correctamente la cuenta conectada:
   - `AuthContext` enlaza wallets nuevas siempre como `'metamask'`.
   - El perfil visto en red tiene `preferred_wallet: "metamask"` y una `wallet_address` distinta.
   - El autologin por wallet crea/usa un usuario sombra basado en `address`, pero no asegura que el tipo de wallet y la dirección activa queden sincronizados con Binance.

Causa raíz probable
- El problema principal ya no es “detectar si Binance está instalada”, sino:
  1) la app muestra conexión de wallet aunque no exista sesión de backend lista para jugar;
  2) el flujo de sincronización wallet → usuario usa supuestos de MetaMask;
  3) el provider activo y la identidad autenticada pueden quedar desfasados.

Plan de solución definitiva
1. Alinear “conectado” vs “autenticado”
- Definir un único estado válido para jugar:
  - wallet conectada
  - dirección activa conocida
  - usuario/sesión de backend creada o recuperada para esa misma dirección
- Ajustar la UI para no mostrar estado ambiguo.

2. Corregir el auto-enlace de wallet en autenticación
- En `AuthContext`, dejar de hardcodear `'metamask'`.
- Usar `activeWalletType` y `address` reales del `WalletContext`.
- Si la dirección cambia, refrescar/reconciliar el perfil correcto.

3. Sincronizar la dirección real de Binance con el perfil
- Revisar el flujo “shadow login” para que:
  - cree/recupere usuario con la dirección activa actual;
  - actualice `wallet_address` y `preferred_wallet` correctamente;
  - no deje un perfil viejo de MetaMask asociado cuando el usuario entra con Binance.

4. Endurecer el provider activo
- Validar que el balance mostrado en el header se consulta con el provider elegido y con la cuenta devuelta por ese provider.
- Añadir verificación explícita de:
  - provider seleccionado
  - `eth_accounts`
  - dirección usada para balance
  - dirección usada para auth

5. Ajustar Lobby para el estado real
- Evitar que `/lobby` dependa de un `user` todavía no sincronizado si la wallet ya está conectada.
- Mostrar un estado intermedio claro (“vinculando cuenta...”) en vez de bloquear con “Debes iniciar sesión” cuando la wallet ya está activa.

Archivos a revisar/cambiar
- `src/contexts/AuthContext.tsx`
- `src/contexts/WalletContext.tsx`
- `src/components/WalletButton.tsx`
- `src/components/ConnectModal.tsx`
- `src/pages/Lobby.tsx`

Detalles técnicos
- Hallazgos concretos del código:
  - `Lobby.tsx` usa `if (!user) toast.error('Debes iniciar sesión para jugar')`
  - `WalletButton.tsx` usa `isWalletConnected || isAuthenticated`
  - `AuthContext.tsx` enlaza wallet con `linkWallet(address, 'metamask')`
  - `AuthContext.tsx` hace shadow auth con email derivado de `address`, pero no asegura sincronía con `activeWalletType`
- Eso explica el síntoma exacto:
  - visualmente parece conectado con Binance;
  - funcionalmente el lobby no lo considera autenticado para jugar;
  - el balance puede salir en 0 porque el perfil/backend o la cuenta consultada no coincide con la wallet real de Binance.

Criterios de aceptación
1. Si el usuario conecta Binance, la sesión queda autenticada automáticamente con esa misma dirección.
2. El lobby deja de mostrar “Debes iniciar sesión para jugar” cuando Binance ya está conectada y sincronizada.
3. El balance mostrado coincide con la cuenta activa de Binance.
4. Si MetaMask y Binance están instaladas a la vez, la app usa exactamente la wallet elegida.
5. La partida de Simba sigue visible y no se toca la lógica de listado de partidas.

Validación al implementar
- Probar con Binance sola.
- Probar con Binance + MetaMask instaladas.
- Confirmar que la dirección del header, la dirección del perfil y la dirección usada al jugar sean la misma.
- Confirmar que Simba sigue apareciendo en lobby y puede unirse sin romper el flujo.
