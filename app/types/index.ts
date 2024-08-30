// app/types/index.ts
export type QuestionSummary = {
	id: string
	question: string
	answer: string
}

export type CSVQuestion = {
	question: string
	answer: string
}

// Definieer het nieuwe type voor volgorde-opties

//export type QuestionOrder = 'random' | 'top-to-bottom' | 'bottom-to-top'
export enum QuestionOrder {
	Random = 'random',
	TopToBottom = 'top-to-bottom',
	BottomToTop = 'bottom-to-top',
}

export enum QuestionReadOption {
	None = 'none',
	ReadWithQuestion = 'read-with-question',
	ReadWithoutQuestion = 'read-without-question',
}
