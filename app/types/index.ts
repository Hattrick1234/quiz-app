// app/types/index.ts

export type QuizType = {
	id: string
	title: string
	questionLanguage: string
	answerLanguage: string
}

export type QuestionSummary = {
	id: string
	orderIndex: number
	question: string
	answer: string
	difficult: boolean
}

export type QuizQuestion = {
	id: string
	question: string
	answer: string
	questionLanguage: string // Voor de taal van de vraag
	answerLanguage: string // Voor de taal van het antwoord
}

export type CSVQuestion = {
	orderIndex: number
	question: string
	answer: string
}

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

export enum AskingOrder {
	QuestionToAnswer = 'question-to-answer',
	AnswerToQuestion = 'answer-to-question',
	Mix = 'mix',
}

export enum DifficultSetting {
	Off = 'off',
	Manual = 'manual',
	Automatic = 'automatic',
}
