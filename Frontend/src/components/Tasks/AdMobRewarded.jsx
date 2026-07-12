// src/components/Tasks/AdMobRewarded.jsx
import React, { useState, useEffect } from 'react';

const AdMobRewarded = ({ onAdWatched, userId }) => {
    const [adLoaded, setAdLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // IDs de prueba de AdMob
    const TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1044960115';
    const TEST_APPLICATION_ID = 'ca-app-pub-3940256099942544~3347511713';

    useEffect(() => {
        // Cargar el script de AdMob
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            setAdLoaded(true);
        };
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    const showAd = async () => {
        if (!adLoaded) return;

        setIsLoading(true);
        try {
            // Crear un overlay oscuro
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.zIndex = '9998';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';

            // Crear contenedor del anuncio
            const adContainer = document.createElement('div');
            adContainer.style.backgroundColor = 'white';
            adContainer.style.padding = '20px';
            adContainer.style.borderRadius = '8px';
            adContainer.style.maxWidth = '90%';
            adContainer.style.maxHeight = '90%';
            adContainer.style.overflow = 'auto';
            
            adContainer.innerHTML = `
                <div style="text-align: center;">
                    <h3>Anuncio de Prueba</h3>
                    <div style="min-height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 20px 0;">
                        <p>Anuncio de prueba - Modo desarrollo</p>
                    </div>
                    <button id="closeAd" style="
                        margin-top: 10px; 
                        padding: 10px 20px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        Cerrar y Obtener Recompensa
                    </button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            overlay.appendChild(adContainer);

            // Manejar el cierre del anuncio
            return new Promise((resolve) => {
                const closeBtn = document.getElementById('closeAd');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                        resolve();
                    };
                }
            });

        } catch (error) {
            console.error('Error al mostrar anuncio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={showAd}
            disabled={!adLoaded || isLoading}
            className={`ad-button ${adLoaded ? 'ready' : 'loading'}`}
        >
            {isLoading ? 'Viendo anuncio...' :
             adLoaded ? 'Ver anuncio (+2 BOOST)' :
             'Preparando anuncio...'}
        </button>
    );
};

export default AdMobRewarded;
