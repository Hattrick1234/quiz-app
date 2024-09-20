// app/types/index.ts

export type QuizType = {
	id: string
	title: string
	questionLanguage: string
	answerLanguage: string
}

export type QuestionSummary = {
	id: string
	question: string
	answer: string
}

export type CSVQuestion = {
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
