export function levenshteinDistance(a: string, b: string): number {
	// Controleer of 'a' en 'b' bestaan; als één van hen 'undefined' is, return vroegtijdig
	if (a === undefined || b === undefined) {
		return -1 // Of een andere default waarde die aangeeft dat de invoer ongeldig was
	}

	// Initialiseer de matrix met een type assertion
	const matrix: number[][] = Array(a.length + 1)
		.fill(null)
		.map(() => Array(b.length + 1).fill(0))

	// Vul de eerste rij en kolom van de matrix
	for (let i = 0; i <= a.length; i++) {
		matrix[i]![0] = i // Gebruik van ! om TypeScript te vertellen dat matrix[i] niet undefined is
	}
	for (let j = 0; j <= b.length; j++) {
		matrix[0]![j] = j // Gebruik van ! om TypeScript te vertellen dat matrix[0] niet undefined is
	}

	// Vul de matrix met de juiste waarden
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1

			matrix[i]![j] = Math.min(
				matrix[i - 1]![j]! + 1, // Verwijderen
				matrix[i]![j - 1]! + 1, // Invoegen
				matrix[i - 1]![j - 1]! + cost, // Vervangen
			)
		}
	}

	// De uiteindelijke afstand staat onderaan rechts in de matrix
	return matrix[a.length]![b.length]!
}
