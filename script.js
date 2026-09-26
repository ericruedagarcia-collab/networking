const SUPABASE_URL = 'https://wiezfulptazkbuneqwxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9oZzyX5cqtxDu0XvKNY2Qg_CeGfziAZ';

let supabaseClient = null;
function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. Traducción (i18n)
    initTranslations();

    // 1. Inicializar iconos Lucide
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (e) {
        console.warn("Lucide Icons no cargó a tiempo");
    }

    // 2. Animaciones de Scroll (Reveal)
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    const revealOptions = {
        threshold: 0.15, // Se activa cuando el 15% del elemento es visible
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Solo animar una vez
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // 3. Manejo de Formularios
    const influencerForm = document.getElementById('influencer-form');
    const businessForm = document.getElementById('business-form');

    // Manejo de formulario Influencer
    if (influencerForm) {
        influencerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = influencerForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Enviando...';
            lucide.createIcons();
            btn.disabled = true;

            try {
                const supabase = getSupabase();
                if (!supabase) throw new Error("Supabase no inicializado");

                const { error } = await supabase.from('waitlist').insert([{
                    role: 'influencer',
                    name: document.getElementById('inf-name').value,
                    email: document.getElementById('inf-email').value,
                    niche: document.getElementById('inf-niche').value
                }]);

                if (error) {
                    console.error("Error saving:", error);
                    btn.innerHTML = 'Error de conexión';
                    btn.disabled = false;
                    setTimeout(() => { btn.innerHTML = originalText; lucide.createIcons(); }, 3000);
                    return;
                }

                btn.innerHTML = originalText;
                lucide.createIcons();
                btn.disabled = false;
                influencerForm.reset();
                
                const successMsg = document.getElementById('inf-success');
                successMsg.style.display = 'flex';
                
                setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
            } catch (err) {
                console.error("Exception:", err);
                btn.innerHTML = 'Error en el sistema';
                btn.disabled = false;
                setTimeout(() => { btn.innerHTML = originalText; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 3000);
            }
        });
    }

    // Manejo de formulario Empresa
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = businessForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Enviando...';
            lucide.createIcons();
            btn.disabled = true;

            try {
                const supabase = getSupabase();
                if (!supabase) throw new Error("Supabase no inicializado");

                const { error } = await supabase.from('waitlist').insert([{
                    role: 'business',
                    name: document.getElementById('biz-name').value,
                    email: document.getElementById('biz-email').value,
                    business_type: document.getElementById('biz-type').value
                }]);

                if (error) {
                    console.error("Error saving:", error);
                    btn.innerHTML = 'Error de conexión';
                    btn.disabled = false;
                    setTimeout(() => { btn.innerHTML = originalText; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 3000);
                    return;
                }

                btn.innerHTML = originalText;
                lucide.createIcons();
                btn.disabled = false;
                businessForm.reset();
                
                const successMsg = document.getElementById('biz-success');
                successMsg.style.display = 'flex';
                
                setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
            } catch (err) {
                console.error("Exception:", err);
                btn.innerHTML = 'Error en el sistema';
                btn.disabled = false;
                setTimeout(() => { btn.innerHTML = originalText; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 3000);
            }
        });
    }

});

// --- Lógica de Traducción ---
const translations = {
    es: {
        gateway_subtitle: "El Nuevo Tinder de los Viajes",
        gateway_creator_title: "Soy Creador",
        gateway_creator_desc: "Viaja y monetiza tu contenido conectando directamente con las mejores marcas.",
        gateway_business_title: "Soy Negocio",
        gateway_business_desc: "Aumenta tu visibilidad colaborando con perfiles verificados sin pagar a agencias.",
        gateway_enter: "Entrar",

        nav_join: "Unirse a la lista",
        ad_placeholder: "Espacio para Anuncio (AdSense)",
        
        inf_hero_title: 'Convierte tu contenido en <span class="text-gradient">experiencias únicas</span>.',
        inf_hero_desc: "La app exclusiva donde los creadores de contenido de viajes conectan con marcas, hoteles y agencias para colaboraciones seguras y sin comisiones de intermediarios.",
        inf_hero_btn: "Quiero Viajar",
        inf_badge: "SIN AGENCIAS",
        inf_about_title: "¿Por qué CollUp?",
        inf_about_p1: "Olvida los correos fríos y los mensajes de Instagram ignorados. Aquí las empresas vienen a buscarte a ti.",
        inf_about_p2: 'CollUp es la primera app "tipo Tinder" exclusiva para el sector turismo que garantiza acuerdos justos, protegiendo tus pagos o asegurando tus canjes y viajes gratis antes de empezar.',
        inf_about_l1: "Cobros 100% garantizados (Escrow).",
        inf_about_l2: "Negociación directa por chat.",
        inf_about_l3: "Acuerdos por canje (hoteles gratis) o remunerados.",
        inf_steps_title: "Encuentra Colaboraciones en 3 Pasos",
        inf_step1_title: "1. Destaca tu Perfil",
        inf_step1_desc: "Muestra tu portfolio, estadísticas reales y tarifas en un perfil verificado que transmite confianza.",
        inf_step2_title: "2. Haz Swipe",
        inf_step2_desc: "Descubre ofertas de hoteles y marcas. Si hay interés mutuo, ¡Es un Match! y se abre un chat privado.",
        inf_step3_title: "3. Disfruta y Cumple el Acuerdo",
        inf_step3_desc: "Disfruta de la experiencia, sube tu contenido y completa el canje o recibe tu pago seguro automáticamente.",
        inf_form_title: "Únete a la Lista VIP de Creadores",
        inf_form_subtitle: "Las plazas son limitadas. Asegura tu acceso temprano antes del lanzamiento oficial.",
        inf_form_card_title: "Soy Creador",
        
        form_user: "Usuario de IG / TikTok",
        form_email: "Email de Contacto",
        form_niche: "¿Cuál es tu Nicho Principal?",
        form_niche_select: "Selecciona tu nicho...",
        niche_travel: "Viajes y Turismo",
        niche_lifestyle: "Estilo de Vida",
        niche_food: "Gastronomía",
        niche_fashion: "Moda y Belleza",
        niche_tech: "Tecnología",
        niche_other: "Otro",
        form_btn: "Reservar mi plaza",
        form_success: "¡Añadido con éxito! Te avisaremos pronto.",
        footer_copy: "© 2026 CollUp. Redefiniendo el marketing de influencia.",

        biz_hero_title: 'Aumenta tus reservas con <span class="text-gradient">influencers verificados</span>.',
        biz_hero_desc: "La plataforma donde hoteles y negocios de turismo conectan directamente con creadores de contenido, sin pagar comisiones abusivas a agencias.",
        biz_hero_btn: "Multiplicar mi Visibilidad",
        biz_badge: "CERO RIESGO",
        biz_about_title: "¿Por qué CollUp?",
        biz_about_p1: "Se acabó pagar a creadores por adelantado cruzando los dedos para que publiquen el contenido acordado.",
        biz_about_p2: "CollUp protege tu inversión, ya sea mediante pagos seguros retenidos hasta la entrega del trabajo o estableciendo acuerdos claros de canje y trueque.",
        biz_about_l1: "Perfiles auditados (adiós seguidores falsos).",
        biz_about_l2: "Match inteligente según tu nicho y ubicación.",
        biz_about_l3: "Contratos digitales automáticos.",
        biz_steps_title: "Colaboraciones Seguras en 3 Pasos",
        biz_step1_title: "1. Publica tu Oferta",
        biz_step1_desc: "Crea tu perfil de negocio, sube fotos de tu hotel o restaurante y define si ofreces canje (estancia) o pago.",
        biz_step2_title: "2. Filtra y Conecta",
        biz_step2_desc: "Usa nuestros filtros para encontrar influencers en tu zona. Haz Match y negocia directamente por el chat integrado.",
        biz_step3_title: "3. Colabora sin Riesgo",
        biz_step3_desc: "Tus pagos están protegidos hasta que el contenido se publica, o podéis cerrar el trato íntegramente mediante canje (trueque).",
        biz_form_title: "Moderniza tu Marketing de Influencia",
        biz_form_subtitle: "Asegura tu acceso anticipado y consigue meses de suscripción gratis por ser de los primeros.",
        biz_form_card_title: "Soy Negocio",
        form_biz_name: "Nombre del Negocio",
        form_biz_email: "Email Corporativo",
        form_biz_type: "Sector del negocio",
        biz_type_select: "Selecciona tu sector...",
        biz_type_hotel: "Hotel / Alojamiento",
        biz_type_agency: "Agencia de Viajes",
        biz_type_restaurant: "Restaurante / Bar",
        biz_type_fashion: "Marca de Ropa",
        biz_form_btn: "Asegurar mi plaza VIP",
        form_success_biz: "¡Añadido con éxito! Nos pondremos en contacto."
    },
    en: {
        gateway_subtitle: "The New Tinder for Travel",
        gateway_creator_title: "I'm a Creator",
        gateway_creator_desc: "Travel and monetize your content by connecting directly with top brands.",
        gateway_business_title: "I'm a Business",
        gateway_business_desc: "Boost your visibility by collaborating with verified profiles without agency fees.",
        gateway_enter: "Enter",

        nav_join: "Join the Waitlist",
        ad_placeholder: "Ad Space Placeholder (AdSense)",
        
        inf_hero_title: 'Turn your content into <span class="text-gradient">unique experiences</span>.',
        inf_hero_desc: "The exclusive app where travel creators connect with brands, hotels, and agencies for secure collaborations without middleman fees.",
        inf_hero_btn: "I Want to Travel",
        inf_badge: "NO AGENCIES",
        inf_about_title: "Why CollUp?",
        inf_about_p1: "Forget cold emails and ignored Instagram DMs. Here, businesses come looking for you.",
        inf_about_p2: 'CollUp is the first "Tinder-style" app exclusively for the tourism sector that guarantees fair agreements, protecting your payments or securing your free travel exchanges before you start.',
        inf_about_l1: "100% Guaranteed Payments (Escrow).",
        inf_about_l2: "Direct negotiation via chat.",
        inf_about_l3: "Exchange deals (free stays) or paid agreements.",
        inf_steps_title: "Find Collabs in 3 Steps",
        inf_step1_title: "1. Stand Out",
        inf_step1_desc: "Showcase your portfolio, real stats, and rates in a verified profile that builds trust.",
        inf_step2_title: "2. Swipe",
        inf_step2_desc: "Discover hotel and brand offers. If there's mutual interest, it's a Match! and a private chat opens.",
        inf_step3_title: "3. Enjoy & Fulfill",
        inf_step3_desc: "Enjoy the experience, upload your content, and complete the exchange or receive your secure payment automatically.",
        inf_form_title: "Join the Creator VIP List",
        inf_form_subtitle: "Spots are limited. Secure your early access before the official launch.",
        inf_form_card_title: "I'm a Creator",
        
        form_user: "IG / TikTok Username",
        form_email: "Contact Email",
        form_niche: "What is your main niche?",
        form_niche_select: "Select your niche...",
        niche_travel: "Travel & Tourism",
        niche_lifestyle: "Lifestyle",
        niche_food: "Food & Dining",
        niche_fashion: "Fashion & Beauty",
        niche_tech: "Technology",
        niche_other: "Other",
        form_btn: "Reserve my spot",
        form_success: "Successfully added! We'll notify you soon.",
        footer_copy: "© 2026 CollUp. Redefining influencer marketing.",

        biz_hero_title: 'Boost your bookings with <span class="text-gradient">verified influencers</span>.',
        biz_hero_desc: "The platform where hotels and tourism businesses connect directly with content creators, without paying abusive agency commissions.",
        biz_hero_btn: "Multiply My Visibility",
        biz_badge: "ZERO RISK",
        biz_about_title: "Why CollUp?",
        biz_about_p1: "No more paying creators upfront and crossing your fingers hoping they post the agreed content.",
        biz_about_p2: "CollUp protects your investment, whether through secure escrow payments released upon delivery or clear exchange and barter agreements.",
        biz_about_l1: "Audited profiles (goodbye fake followers).",
        biz_about_l2: "Smart match based on your niche and location.",
        biz_about_l3: "Automatic digital contracts.",
        biz_steps_title: "Secure Collabs in 3 Steps",
        biz_step1_title: "1. Post Your Offer",
        biz_step1_desc: "Create your business profile, upload photos of your hotel or restaurant, and define if you offer an exchange (stay) or payment.",
        biz_step2_title: "2. Filter & Connect",
        biz_step2_desc: "Use our filters to find influencers in your area. Match and negotiate directly through the integrated chat.",
        biz_step3_title: "3. Collaborate Risk-Free",
        biz_step3_desc: "Your payments are protected until the content is published, or you can close the deal entirely through a barter exchange.",
        biz_form_title: "Modernize Your Influencer Marketing",
        biz_form_subtitle: "Secure your early access and get months of free subscription for being one of the first.",
        biz_form_card_title: "I'm a Business",
        form_biz_name: "Business Name",
        form_biz_email: "Corporate Email",
        form_biz_type: "Business Sector",
        biz_type_select: "Select your sector...",
        biz_type_hotel: "Hotel / Accommodation",
        biz_type_agency: "Travel Agency",
        biz_type_restaurant: "Restaurant / Bar",
        biz_type_fashion: "Clothing Brand",
        biz_form_btn: "Secure my VIP spot",
        form_success_biz: "Successfully added! We'll be in touch."
    }
};

let currentLang = 'es';

function initTranslations() {
    const savedLang = localStorage.getItem('collup_lang');
    if (savedLang) {
        currentLang = savedLang;
    }
    applyTranslations();
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('collup_lang', lang);
    applyTranslations();
}

function applyTranslations() {
    // 1. Update text content
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });

    // 2. Update active button state
    const btnEs = document.getElementById('btn-es');
    const btnEn = document.getElementById('btn-en');
    
    if (btnEs && btnEn) {
        if (currentLang === 'es') {
            btnEs.classList.add('active');
            btnEn.classList.remove('active');
        } else {
            btnEn.classList.add('active');
            btnEs.classList.remove('active');
        }
    }
}
