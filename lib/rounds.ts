export type Round = { id: string; text: string; author: "human" | "ai"; credit: string };

/** Human texts are real, attributed quotes; AI texts were written by an AI model for this game. */
export const ROUNDS: Round[] = [
  { id: "h1", author: "human", credit: "Gustavo Adolfo Bécquer · Rima XXIII (1871)", text: "Por una mirada, un mundo;\npor una sonrisa, un cielo;\npor un beso... ¡yo no sé\nqué te diera por un beso!" },
  { id: "h2", author: "human", credit: "Antonio Machado · Proverbios y cantares (1912)", text: "Caminante, no hay camino,\nse hace camino al andar." },
  { id: "h3", author: "human", credit: "José Martí · Versos sencillos (1891)", text: "Cultivo una rosa blanca\nen junio como en enero\npara el amigo sincero\nque me da su mano franca." },
  { id: "h4", author: "human", credit: "Rubén Darío · Canción de otoño en primavera (1905)", text: "Juventud, divino tesoro,\n¡ya te vas para no volver!\nCuando quiero llorar, no lloro...\ny a veces lloro sin querer." },
  { id: "h5", author: "human", credit: "Miguel de Cervantes · Don Quijote, II parte (1615)", text: "El que lee mucho y anda mucho, ve mucho y sabe mucho." },
  { id: "h6", author: "human", credit: "Sor Juana Inés de la Cruz · Redondillas (1689)", text: "Hombres necios que acusáis\na la mujer sin razón,\nsin ver que sois la ocasión\nde lo mismo que culpáis." },
  { id: "h7", author: "human", credit: "Alfonsina Storni · Tú me quieres blanca (1918)", text: "Tú me quieres blanca,\nme quieres de espumas,\nme quieres de nácar." },
  { id: "h8", author: "human", credit: "Alan Turing · Computing Machinery and Intelligence (1950), traducción", text: "Solo podemos ver poco del futuro, pero lo suficiente para darnos cuenta de que hay mucho por hacer." },
  { id: "h9", author: "human", credit: "Gustavo Adolfo Bécquer · Rima XXI (1871)", text: "¿Qué es poesía?, dices mientras clavas\nen mi pupila tu pupila azul.\n¿Qué es poesía? ¿Y tú me lo preguntas?\nPoesía... eres tú." },
  { id: "h10", author: "human", credit: "Antonio Machado · Proverbios y cantares", text: "Hoy es siempre todavía." },

  { id: "a1", author: "ai", credit: "Generado por IA", text: "Guardé tu nombre en el bolsillo\ncomo quien guarda una semilla:\nno sé si dará flor,\npero ya pesa como un bosque." },
  { id: "a2", author: "ai", credit: "Generado por IA", text: "No hay mapa para el corazón que se pierde,\nsolo huellas que el viento\nconvierte en camino." },
  { id: "a3", author: "ai", credit: "Generado por IA", text: "Quien pregunta con paciencia aprende dos veces: una por la respuesta y otra por el silencio que la antecede." },
  { id: "a4", author: "ai", credit: "Generado por IA", text: "La lluvia escribe en la ventana\nlo que tú nunca me dijiste;\nyo la leo despacio,\npor si se borra." },
  { id: "a5", author: "ai", credit: "Generado por IA", text: "Tenía miedo de olvidarte,\npor eso aprendí tu risa de memoria\ny la repito en voz baja\ncuando la casa se queda muda." },
  { id: "a6", author: "ai", credit: "Generado por IA", text: "El futuro no se predice: se programa línea por línea, con errores incluidos." },
  { id: "a7", author: "ai", credit: "Generado por IA", text: "Mi abuela medía el tiempo en cafés:\nuno para despertar,\notro para recordar,\ny el último para despedirse del día." },
  { id: "a8", author: "ai", credit: "Generado por IA", text: "Somos río y no orilla:\nlo que nos detiene\nno es la piedra,\nsino el miedo a rodearla." },
  { id: "a9", author: "ai", credit: "Generado por IA", text: "Cada amanecer es una carta\nque el mundo nos escribe\nsin saber si la vamos a abrir." },
  { id: "a10", author: "ai", credit: "Generado por IA", text: "El que mucho duda, poco camina; pero el que nunca duda, camina hacia cualquier parte." },
];

export const ROUNDS_PER_GAME = 10;

/** Picks 5 human + 5 AI rounds in random order. */
export function pickRounds(random: () => number = Math.random): Round[] {
  const shuffle = <T,>(list: T[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const half = ROUNDS_PER_GAME / 2;
  const human = shuffle(ROUNDS.filter((r) => r.author === "human")).slice(0, half);
  const ai = shuffle(ROUNDS.filter((r) => r.author === "ai")).slice(0, half);
  return shuffle([...human, ...ai]);
}
