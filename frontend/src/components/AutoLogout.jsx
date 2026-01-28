import { useEffect, useRef } from 'react';

const AutoLogout = () => {
  const timerRef = useRef(null);
  // 10 minutos em milissegundos
  const TIMEOUT_MS = 10 * 60 * 1000;

  useEffect(() => {
    const handleLogout = () => {
      // Limpa dados de sessão/local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redireciona para a raiz (login)
      window.location.href = '/';
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Inicia o timer na montagem
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return null;
};

export default AutoLogout;