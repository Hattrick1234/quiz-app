// Voeg deze functie toe in play.tsx of importeer deze vanuit een apart bestand
export function letterPerLetterComparison(
	input: string,
	correctAnswer: string,
) {
	const maxLength = Math.max(input.length, correctAnswer.length)
	let differences: { index: number; inputChar: string; correctChar: string }[] =
		[]

	for (let i = 0; i < maxLength; i++) {
		const inputChar = input[i] || '' // Leeg teken als niet gedefinieerd
		const correctChar = correctAnswer[i] || '' // Leeg teken als niet gedefinieerd

		if (inputChar !== correctChar) {
			differences.push({ index: i, inputChar, correctChar })
		}
	}

	return differences
}
