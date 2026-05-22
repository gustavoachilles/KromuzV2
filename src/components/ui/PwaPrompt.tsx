"use client";

import { useEffect, useState } from "react";
import { Download, Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS for specific install instructions
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      // Already installed
    } else {
      // Not installed, show prompt after 3 seconds
      const timer = setTimeout(() => setShowInstall(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Check push notifications status
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPush(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert("Para instalar no iOS: toque no botão Compartilhar e depois em 'Adicionar à Tela de Início'.");
    }
  };

  const handlePushClick = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowPush(false);
        // Here we could subscribe the user and send the PushSubscription to our backend
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 items-end">
      <AnimatePresence>
        {showInstall && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-zinc-900 border border-zinc-800 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm"
          >
            <div className="bg-brand/20 p-2 rounded-xl text-brand">
              <Download className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">Instalar App</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Instale o Kromuz para uma melhor experiência.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-brand hover:bg-brand/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowInstall(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {showPush && !showInstall && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-zinc-900 border border-zinc-800 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm"
          >
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">Notificações</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Receba alertas de novos leads e mensagens.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePushClick}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                Ativar
              </button>
              <button
                onClick={() => setShowPush(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
