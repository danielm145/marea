// ============================================================================
// CASABLANCA · las imágenes del viaje, hechas con la IA de Google UNA vez y guardadas.
//   GET /api/arte          → la lista de imágenes que existen (la app sabe cuáles pedir)
//   GET /api/arte/<clave>  → la imagen (se dibuja la primera vez; después sale del caché)
// No hay botones: scripts/listo.sh las pide todas al publicar, y la app las muestra solas.
// Solo se dibuja lo que está en este catálogo (nadie puede pedir una imagen cualquiera).
// ============================================================================

const FOTO = "Fotografía editorial realista de revista de viajes, luz natural cálida de la costa, colores vivos pero naturales, nítida y bonita. Sin texto, sin letras, sin logos, sin marcas de agua.";
const LUGAR = "En Same, Esmeraldas, en la costa del Pacífico de Ecuador: playa ancha de arena dorada, olas suaves, palmeras de coco, un condominio blanco de estilo mediterráneo frente al mar.";
const GENTE = "Un grupo de amigos latinos de unos 30 años, alegres y con estilo, en momentos espontáneos (nadie mira a la cámara).";
const COMIDA = "Fotografía de comida profesional estilo restaurante gourmet, emplatado elegante en cerámica artesanal sobre mesa de madera clara junto al mar, luz natural de tarde, profundidad de campo, apetitosa y realista. Formato cuadrado. Sin texto, sin letras, sin logos.";
const ROPA = "Fotografía de moda flat lay vista desde arriba sobre lino claro con un poco de arena y una hoja de palma, prendas y accesorios ordenados con estilo editorial de revista de verano, luz natural suave. Sin personas. Formato vertical 3:4. Sin texto, sin letras, sin logos.";

const ev = (s) => `${FOTO} ${LUGAR} ${GENTE} ${s} Formato horizontal 16:9.`;
const act = (s) => `${FOTO} ${LUGAR} ${GENTE} ${s} Formato horizontal 16:9.`;

export const ARTE = {
  // ── los carros (los dos son BLANCOS) y la salida ──
  "carro-lexus": `${FOTO} Una SUV Lexus BLANCA perlada, limpia y brillante, con maletas y una tabla de surf en la parrilla del techo, estacionada en una carretera costera de Ecuador con palmeras y el mar Pacífico al fondo, sol de mañana. Sin personas. Formato horizontal 16:9.`,
  "carro-amarok": `${FOTO} Una camioneta pickup Volkswagen Amarok BLANCA, doble cabina, con hieleras, un parlante y tablas de surf en el balde, en una carretera de los Andes de Ecuador que baja hacia la costa entre montañas verdes, palmeras y el mar a lo lejos. Sin personas. Formato horizontal 16:9.`,
  salida: `${FOTO} Dos carros blancos, una SUV Lexus y una camioneta Volkswagen Amarok, listos para un viaje de playa al amanecer frente a una casa con jardín en Cumbayá, con las montañas verdes de los Andes de Ecuador al fondo, maletas, hieleras y tablas de surf. Cielo rosado y dorado. Sin personas. Formato horizontal 16:9.`,

  // ── el itinerario ──
  "ev-salida": ev("Amigos subiendo maletas, hieleras y gafas de sol a una SUV blanca y a una camioneta blanca al amanecer en un barrio con montañas verdes de los Andes, emoción de viaje por carretera."),
  "ev-almuerzo": ev("Almuerzo de carretera en un restaurante típico de la vía a la costa de Ecuador: mesa larga de madera con encocado, patacones, jugos naturales, amigos riendo, vegetación tropical alrededor."),
  "ev-ceviche": ev("Recepción de bienvenida en la terraza de la casa de playa: una gran fuente de ceviche ecuatoriano de camarón con chifles y canguil, cervezas heladas, amigos recién llegados brindando, el mar al fondo."),
  "ev-checkin": ev("Llegada a la casa blanca de playa: maletas con ruedas, sombreros de paja, amigos abriendo las puertas de vidrio hacia la terraza con piscina turquesa y palmeras, primera mirada emocionada al mar."),
  "ev-micheladas": ev("Tarde de playa: micheladas heladas con borde de sal y limón en vasos grandes sobre una mesita en la arena, amigos riendo en sillas de playa, paletas y una pelota cerca, el mar brillando."),
  "ev-atardecer": ev("Grupo de amigos abrazados en la orilla al atardecer, siluetas contra un sol naranja enorme que se pone en el Pacífico, reflejos dorados en la arena mojada."),
  "ev-fogata": ev("Noche de estrellas: amigos vestidos de blanco cenando en una mesa larga con velas en la arena y después alrededor de una fogata en la playa, mantas, malvaviscos en palitos, cielo lleno de estrellas y la Vía Láctea."),
  "ev-yoga": ev("Yoga al amanecer en la arena frente al mar en calma, esteras en fila, cielo rosado y durazno, bruma suave, serenidad."),
  "ev-panzazos": ev("Concurso de panzazos en la piscina turquesa del condominio: un amigo en el aire a punto de caer de barriga, gran salpicadura, tres amigos en el borde con cartelitos de puntaje, todos muertos de risa."),
  "ev-bbq": ev("Parrillada al atardecer en la terraza: carnes, chorizos y mazorcas en la parrilla con humo, barra de cócteles con mojitos y margaritas, luces colgantes, vestidos dorados y beige."),
  "ev-karaoke": ev("Noche de karaoke en la sala de la casa de playa: un proyector con la letra de la canción en la pared, dos amigos cantando con micrófonos y mucha actitud, los demás aplaudiendo, luces de neón moradas y rosadas."),
  "ev-spikeball": ev("Partido de spike ball y paletas en la arena: la pelota amarilla en el aire, amigos lanzándose con energía, salpicaduras de arena, sol de mañana."),
  "ev-fotos": ev("Sesión de fotos divertida en la playa con gafas de sol extravagantes, camisas hawaianas y flores, poses graciosas, estilo tiki boho."),
  "ev-tapas": ev("Noche de tapas y vino en la terraza: gambas al ajillo, patatas bravas, tortilla española, tabla de quesos y jamón, copas de vino tinto, velas, amigos conversando."),
  "ev-checkout": ev("Último desayuno y foto de grupo frente a la casa de playa antes de irse, maletas listas, abrazos, mañana luminosa."),
  "ev-pizza": ev("Noche de pizzas caseras y juegos de mesa: amigos armando pizzas en la cocina abierta y jugando cartas en la mesa, risas, luz cálida."),
  "ev-restaurante": ev("Cena en un restaurante frente al mar con antorchas, mariscos y cócteles, amigos elegantes brindando."),
  "ev-throwback": ev("Fiesta temática de los años 2000 en la casa de playa: ropa brillante, gafas de colores, cámaras viejas, bailando con luces de colores."),
  "ev-cine": ev("Cine bajo las estrellas en el jardín: proyector sobre una sábana blanca, cojines, mantas, canguil, amigos acostados mirando la película."),
  "ev-tesoro": ev("Búsqueda del tesoro en la playa: amigos con un mapa dibujado a mano, un cofre pequeño medio enterrado en la arena, risas y carreras."),
  "ev-olimpiadas": ev("Olimpiadas de playa: carreras de relevos en la arena, cintas de colores en la cabeza, medallas de juguete, equipos compitiendo."),

  // ── los juegos (portadas) ──
  "juego-trivia": act("Amigos en la sala de la casa de playa jugando trivia con sus celulares en la mano, emocionados, una pantalla grande con botones de colores rojo, azul, amarillo y verde, ambiente de competencia divertida."),
  "juego-probable": act("Amigos sentados en círculo en la terraza señalándose unos a otros entre carcajadas, como en el juego ¿quién es más probable que…?, cocteles en la mano, atardecer."),
  "juego-karaoke": act("Primer plano de un micrófono dorado sobre un fondo de luces de neón moradas y rosadas, con amigos desenfocados cantando atrás en la sala de la casa de playa."),
  "juego-carro": `${FOTO} Amigos riendo dentro de una SUV blanca en un viaje por carretera hacia la costa de Ecuador, uno con el celular en la mano jugando, palmeras por la ventana, luz de mañana. Formato horizontal 16:9.`,
  "juego-premios": act("Pequeños trofeos dorados y medallas sobre una mesa con luces de fiesta después del karaoke, amigos aplaudiendo al fondo."),

  // ── actividades de playa ──
  "act-voley": act("Partido de vóley playero con una red improvisada en la arena, un amigo saltando a rematar, otros celebrando."),
  "act-spikeball": act("Spike ball en la arena: el aro redondo en el centro, cuatro amigos alrededor, la pelota amarilla rebotando."),
  "act-futbol": act("Fútbol playero descalzos con arcos hechos de chancletas, la pelota en el aire, arena volando."),
  "act-paletas": act("Paletas de playa de madera y una pelotita en la orilla, dos amigos peloteando con las olas a los pies."),
  "act-frisbee": act("Un frisbee volando sobre la playa al atardecer, un amigo lanzándose para atraparlo."),
  "act-relevos": act("Carrera de relevos con baldes de agua en la playa, amigos mojándose entre risas."),
  "act-castillos": act("Concurso de castillos de arena: un castillo grande y detallado con conchas, amigos con baldes y palas compitiendo."),
  "act-tesoro": act("Búsqueda del tesoro: un mapa dibujado a mano, pistas en botellas y un pequeño cofre en la arena."),
  "act-cuerda": act("Tira y afloja con una cuerda gruesa en la arena, dos equipos tirando con todas sus fuerzas, caras de esfuerzo y risa."),
  "act-limbo": act("Juego del limbo en la playa con un palo de bambú, un amigo pasando por debajo hacia atrás, los demás animando con música."),
  "act-mar": act("Amigos corriendo hacia el mar y saltando las olas, salpicaduras brillantes al sol."),
  "act-mimica": act("Juego de mímica y adivinanzas sobre toallas en la arena, una amiga actuando con gestos exagerados y los demás adivinando entre risas."),

  // ── los looks (él y ella) ──
  "look-welcome-white-el": `${ROPA} Look de hombre todo en blanco para una noche de playa: camisa de lino blanca, pantalón de lino crudo, sandalias de cuero, pulsera tejida.`,
  "look-welcome-white-ella": `${ROPA} Look de mujer todo en blanco para una noche de playa: vestido largo de lino o crochet blanco, sandalias doradas, aretes de concha, bolso de paja.`,
  "look-golden-hour-el": `${ROPA} Look de hombre en dorado, beige y chocolate: camisa de satén o lino beige, pantalón chocolate, mocasines, reloj dorado.`,
  "look-golden-hour-ella": `${ROPA} Look de mujer en dorado, beige y chocolate: vestido de satén dorado, sandalias de tiras, accesorios dorados, cartera pequeña.`,
  "look-tiki-boho-el": `${ROPA} Look de hombre tiki boho divertido: camisa hawaiana colorida, shorts beige, gafas de sol extravagantes, collar de flores.`,
  "look-tiki-boho-ella": `${ROPA} Look de mujer tiki boho divertido: top floral, falda boho fluida, flor en el pelo, gafas de sol de colores, sandalias de rafia.`,

  // ── la comida que no tiene foto propia ──
  "plato-ceviche": `${COMIDA} Ceviche ecuatoriano de camarón y pescado en un bol grande, cebolla colorada, tomate, cilantro, limón, con chifles y canguil al lado.`,
  "plato-cafe": `${COMIDA} Café de especialidad pasado en una prensa francesa y tazas de cerámica, granos de café, desayuno frente al mar.`,
  "plato-fruta": `${COMIDA} Fuente de fruta tropical recién picada: mango, piña, papaya y sandía.`,
  "plato-jugos": `${COMIDA} Jugo de naranja recién exprimido en jarra de vidrio y un coco verde abierto con sorbete.`,
  "plato-coco": `${COMIDA} Agua de coco en cocos verdes y vasos de jugo de maracuyá con hielo.`,
  "plato-cerveza": `${COMIDA} Botellas de cerveza heladas con gotas en un balde con hielo sobre la arena.`,
  "plato-chimichurri": `${COMIDA} Chimichurri casero en un bol de cerámica con perejil, ajo y ají, junto a una tabla de parrilla.`,
  "plato-cocteles": `${COMIDA} Barra de cócteles: mojitos con hierbabuena, margaritas con borde de sal y cuba libre, sobre una barra de madera junto al mar.`,
  "plato-sin-alcohol": `${COMIDA} Cócteles sin alcohol: mojito virgen, limonada de hierbabuena y maracuyá con soda, vasos altos con hielo.`,
  "plato-quesos": `${COMIDA} Tabla de quesos maduros, embutidos y aceitunas con pan.`,
  "plato-vino": `${COMIDA} Copas de vino blanco y vino tinto Tempranillo con una botella, al atardecer.`,
  "plato-sangria": `${COMIDA} Jarra de sangría sin alcohol con frutas picadas y soda.`,
  "plato-hamburguesas": `${COMIDA} Hamburguesas caseras con queso derretido, lechuga y tomate en pan brioche.`,
  "plato-papas": `${COMIDA} Papas rústicas al horno con romero y ajo en una sartén de hierro.`,
  "plato-patacones": `${COMIDA} Patacones crocantes con queso fresco rallado.`,
  "plato-yogurt": `${COMIDA} Yogurt natural cremoso en un bol de cerámica con arándanos frescos y un poco de granola, desayuno frente al mar.`,
  "plato-pescado": `${COMIDA} Pescado a la plancha con ensalada de pepino y aguacate y limón.`,
};

// la imagen sale del caché de Cloudflare; si no está, se dibuja y se guarda 30 días.
// La versión en la clave del caché: subirla obliga a dibujar todo de nuevo.
export const ARTE_VER = "v2";
